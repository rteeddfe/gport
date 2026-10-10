import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { UpdateIntegrationDto } from './dto/update-integration.dto.js';
import {
  INTEGRATION_PROVIDER_NAMES,
  INTEGRATION_SPECS,
  integrationFromRoute,
  type IntegrationSpec,
} from './integration-registry.js';
import { IntegrationSecretService } from './integration-secret.service.js';
import { readStringBag } from './read-json-bag.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  AuditService,
} from '../audit/audit.service.js';
import type {
  AuditActor,
  AuditEntryInput,
  AuditRequestContext,
} from '../audit/audit.types.js';

/** Trusted audit context of an admin mutation: the actor comes from the
 * authenticated request (`@CurrentUser()`), the request part carries only
 * the server-extracted ip/user-agent. Never supplied by the client. */
export interface MutationAuditContext {
  actor: AuditActor;
  request?: AuditRequestContext;
}

/** Safe view returned to the admin UI: config values only, secrets
 * collapsed to configured flags. A plaintext secret must never appear
 * anywhere in this shape. */
export interface IntegrationView {
  provider: string;
  type: string;
  title: string;
  description: string;
  enabled: boolean;
  /** Every registry config field (M-INTEGRATIONS-2: includes the OAuth
   * redirect URI — a validated, backend-controlled value, never an
   * arbitrary URL). Empty string = not set yet. */
  config: Record<string, string>;
  /** True when every registry field (required config + required secrets)
   * is present. */
  configured: boolean;
  /** Per-secret presence flags (required + optional secrets) — values are
   * never included. */
  secretsConfigured: Record<string, boolean>;
  updatedAt: string | null;
}

type IntegrationRow = Prisma.IntegrationGetPayload<object>;

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly secretService: IntegrationSecretService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /** Every registered provider, merged with its stored row (defaults for
   * providers without a row yet). Secrets are never read, only counted. */
  async list(): Promise<IntegrationView[]> {
    const rows = await this.prisma.integration.findMany();
    const byProvider = new Map(rows.map((row) => [row.provider, row]));
    return Object.values(INTEGRATION_SPECS).map((spec) =>
      this.toView(spec, byProvider.get(spec.provider)),
    );
  }

  async find(providerRoute: string): Promise<IntegrationView> {
    const spec = this.requireSpec(providerRoute);
    const row = await this.prisma.integration.findUnique({
      where: { provider: spec.provider },
    });
    return this.toView(spec, row ?? undefined);
  }

  /**
   * Create or update an integration. Rules (M-INTEGRATIONS-1 §6 /
   * M-INTEGRATIONS-2):
   * - unknown config/secret field names are rejected (the client is never
   *   trusted) and registry validators (e.g. the OAuth redirect URI
   *   allowlist) run on every write — an invalid value is never stored;
   * - a secret absent or empty ('') in the payload leaves the stored
   *   secret untouched — an empty string is never treated as a new value
   *   and never as a deletion;
   * - non-empty secret values are encrypted before they reach the DB.
   */
  async update(
    providerRoute: string,
    dto: UpdateIntegrationDto,
    audit: MutationAuditContext,
  ): Promise<IntegrationView> {
    const spec = this.requireSpec(providerRoute);
    const storableSecretNames = new Set(
      [...spec.secretFields, ...(spec.optionalSecretFields ?? [])].map(
        (field) => field.name,
      ),
    );

    const configUpdate = this.sanitizeConfig(dto.config, spec);
    const secretEnvelopes: Record<string, string> = {};
    for (const [name, value] of Object.entries(dto.secrets ?? {})) {
      if (!storableSecretNames.has(name)) {
        throw new BadRequestException(
          `Недопустимое поле секрета: ${JSON.stringify(name)}`,
        );
      }
      if (typeof value !== 'string') {
        throw new BadRequestException(`Секрет ${name} должен быть строкой`);
      }
      // Empty string = "no change"; a real replacement is a non-empty value.
      if (value === '') {
        continue;
      }
      secretEnvelopes[name] = this.secretService.encrypt(value);
    }

    const existing = await this.prisma.integration.findUnique({
      where: { provider: spec.provider },
    });
    const existingConfig = readStringBag(existing?.config);
    const existingSecrets = readStringBag(existing?.secrets);

    const replacedSecrets = Object.keys(secretEnvelopes);
    if (replacedSecrets.length > 0) {
      this.logger.log(
        `${spec.provider}: secret(s) ${replacedSecrets.join(', ')} replaced`,
      );
    }

    const config = { ...existingConfig, ...configUpdate };
    const secrets = { ...existingSecrets, ...secretEnvelopes };
    const data = {
      enabled: dto.enabled ?? existing?.enabled ?? false,
      config: config as Prisma.InputJsonValue,
      secrets: secrets as Prisma.InputJsonValue,
    };

    // Mutation + audit commit atomically: a security-sensitive change can
    // never land without its audit trail (M-AUDIT-1 §11).
    const row = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.integration.upsert({
        where: { provider: spec.provider },
        update: {
          enabled: data.enabled,
          config: data.config as Prisma.InputJsonValue | undefined,
          secrets: data.secrets as Prisma.InputJsonValue | undefined,
        },
        create: {
          provider: spec.provider,
          type: spec.type,
          ...data,
        },
      });
      for (const entry of this.updateAuditEntries(
        spec,
        existing ?? undefined,
        existingConfig,
        existingSecrets,
        config,
        Object.keys(secretEnvelopes),
        data.enabled,
        audit,
      )) {
        await this.auditService.logInTransaction(tx, entry);
      }
      return upserted;
    });
    this.logger.log(`${spec.provider}: configuration updated`);
    return this.toView(spec, row);
  }

  private requireSpec(route: string): IntegrationSpec {
    const provider = integrationFromRoute(route);
    if (provider === null || !INTEGRATION_PROVIDER_NAMES.includes(provider)) {
      throw new BadRequestException('Неизвестная интеграция');
    }
    return INTEGRATION_SPECS[provider];
  }

  /**
   * Audit entries for one PUT. Allowlisted metadata shapes only — field
   * NAMES of what changed, never values, never secrets (M-AUDIT-1 §7-10).
   * A fresh row yields one `integration.created`; an update yields
   * `integration.updated` (changedFields) plus enabled/secret events for
   * each logical change.
   */
  private updateAuditEntries(
    spec: IntegrationSpec,
    existing: IntegrationRow | undefined,
    configBefore: Record<string, string>,
    _secretsBefore: Record<string, string>,
    configAfter: Record<string, string>,
    secretNamesSet: string[],
    enabled: boolean,
    audit: MutationAuditContext,
  ): AuditEntryInput[] {
    const base = {
      actor: audit.actor,
      entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
      entityId: spec.provider,
      request: audit.request,
    };
    const entries: AuditEntryInput[] = [];
    if (!existing) {
      entries.push({
        ...base,
        action: AUDIT_ACTIONS.INTEGRATION_CREATED,
        metadata: {
          changedFields: spec.configFields
            .map((field) => field.name)
            .filter((name) => (configAfter[name] ?? '') !== ''),
          secretFields: secretNamesSet,
          enabled: enabled,
        },
      });
      return entries;
    }
    const changedFields = spec.configFields
      .map((field) => field.name)
      .filter((name) => (configBefore[name] ?? '') !== (configAfter[name] ?? ''));
    if (changedFields.length > 0) {
      entries.push({
        ...base,
        action: AUDIT_ACTIONS.INTEGRATION_UPDATED,
        metadata: { changedFields },
      });
    }
    if (existing.enabled !== enabled) {
      entries.push({
        ...base,
        action: enabled
          ? AUDIT_ACTIONS.INTEGRATION_ENABLED
          : AUDIT_ACTIONS.INTEGRATION_DISABLED,
      });
    }
    for (const name of secretNamesSet) {
      entries.push({
        ...base,
        action: AUDIT_ACTIONS.INTEGRATION_SECRET_SET,
        metadata: { secretField: name, operation: 'set' },
      });
    }
    return entries;
  }

  /** Explicit secret removal — the only way a stored secret disappears
   * (an empty/absent secret in PUT never deletes). */
  async removeSecret(
    providerRoute: string,
    fieldName: string,
    audit: MutationAuditContext,
  ): Promise<IntegrationView> {
    const spec = this.requireSpec(providerRoute);
    const storableSecretNames = [
      ...spec.secretFields,
      ...(spec.optionalSecretFields ?? []),
    ];
    if (!storableSecretNames.some((field) => field.name === fieldName)) {
      throw new BadRequestException(
        `Неизвестный секрет интеграции: ${JSON.stringify(fieldName)}`,
      );
    }
    const existing = await this.prisma.integration.findUnique({
      where: { provider: spec.provider },
    });
    if (!existing) {
      throw new NotFoundException('Секрет не настроен');
    }
    const secrets = readStringBag(existing.secrets);
    if (!(fieldName in secrets)) {
      throw new NotFoundException('Секрет не настроен');
    }
    const { [fieldName]: _removed, ...rest } = secrets;
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.integration.update({
        where: { provider: spec.provider },
        data: { secrets: rest as Prisma.InputJsonValue },
      });
      await this.auditService.logInTransaction(tx, {
        actor: audit.actor,
        action: AUDIT_ACTIONS.INTEGRATION_SECRET_DELETED,
        entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
        entityId: spec.provider,
        metadata: { secretField: fieldName, operation: 'delete' },
        request: audit.request,
      });
      return updated;
    });
    this.logger.log(`${spec.provider}: secret ${fieldName} removed`);
    return this.find(providerRoute);
  }

  /** Reset: removes the stored row — the integration falls back to its
   * not-configured defaults. */
  async remove(
    providerRoute: string,
    audit: MutationAuditContext,
  ): Promise<void> {
    const spec = this.requireSpec(providerRoute);
    await this.prisma.$transaction(async (tx) => {
      await tx.integration.deleteMany({ where: { provider: spec.provider } });
      await this.auditService.logInTransaction(tx, {
        actor: audit.actor,
        action: AUDIT_ACTIONS.INTEGRATION_DELETED,
        entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
        entityId: spec.provider,
        request: audit.request,
      });
    });
    this.logger.log(`${spec.provider}: configuration reset`);
  }

  private sanitizeConfig(
    raw: Record<string, string> | undefined,
    spec: IntegrationSpec,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, value] of Object.entries(raw ?? {})) {
      const field = spec.configFields.find((entry) => entry.name === name);
      if (!field) {
        throw new BadRequestException(
          `Недопустимое поле конфигурации: ${JSON.stringify(name)}`,
        );
      }
      if (typeof value !== 'string') {
        throw new BadRequestException(`Значение ${name} должно быть строкой`);
      }
      const trimmed = value.trim();
      const validator = spec.configValidators?.[name];
      if (validator) {
        const error = validator(value.trim(), this.configService);
        if (error) {
          throw new BadRequestException(error);
        }
      }
      result[name] = trimmed;
    }
    return result;
  }

  /** Safe projection: reads the DB row only to compute presence flags —
   * the secrets bag is never copied into the view. The config bag always
   * carries EVERY registry config field (empty string = not set yet), so
   * the admin form renders the full field set even for a fresh row. */
  private toView(spec: IntegrationSpec, row?: IntegrationRow): IntegrationView {
    const storedConfig = row ? readStringBag(row.config) : {};
    const storedSecrets = row ? readStringBag(row.secrets) : {};
    const config: Record<string, string> = {};
    for (const field of spec.configFields) {
      const value = storedConfig[field.name];
      config[field.name] = typeof value === 'string' ? value : '';
    }
    const secretsConfigured: Record<string, boolean> = {};
    for (const field of [
      ...spec.secretFields,
      ...(spec.optionalSecretFields ?? []),
    ]) {
      secretsConfigured[field.name] =
        typeof storedSecrets[field.name] === 'string' &&
        storedSecrets[field.name].length > 0;
    }
    const configConfigured = spec.configFields.every(
      (field) => config[field.name].length > 0,
    );
    const requiredSecretsConfigured = spec.secretFields.every(
      (field) => secretsConfigured[field.name],
    );
    return {
      provider: spec.provider,
      type: spec.type,
      title: spec.title,
      description: spec.description,
      enabled: row?.enabled ?? false,
      config,
      configured: configConfigured && requiredSecretsConfigured,
      secretsConfigured,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }
}
