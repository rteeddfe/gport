import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Integration } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AppConfiguration, OAuthProviderConfiguration } from '../config/configuration.js';
import {
  INTEGRATION_SPECS,
  type IntegrationOAuthSpec,
} from './integration-registry.js';
import { IntegrationSecretService } from './integration-secret.service.js';
import { readStringBag } from './read-json-bag.js';

/**
 * Runtime configuration resolver (M-INTEGRATIONS-2): the ONLY path through
 * which feature runtime (OAuth today) sees integration settings. Consumers
 * stay ignorant of Prisma, the encrypted JSON bags and the secrets vault —
 * they receive a plain configuration object, or the uniform all-empty
 * "disabled" shape the ENV flow already used for a provider that is off.
 *
 * Priority (fixed policy, M-INTEGRATIONS-2 §4-5):
 *   1. a DB Integration row is AUTHORITATIVE whenever it exists —
 *      `enabled=false` or an incomplete configuration means DISABLED,
 *      never an ENV fallback (an admin turning an integration off must
 *      not be silently undone by stale ENV credentials);
 *   2. ENV fallback ONLY when no DB row exists (backwards compatibility
 *      for pre-integrations deployments — see .env.example).
 *
 * No caching: every request re-reads the row, so an admin save applies on
 * the very next OAuth request without a restart (correctness first).
 */
@Injectable()
export class IntegrationRuntimeService {
  private readonly logger = new Logger(IntegrationRuntimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly secretService: IntegrationSecretService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Effective OAuth configuration for a provider ("yandex" | "vk").
   * Disabled and incomplete integrations both yield an all-empty
   * configuration — exactly what the pre-integrations flow used for a
   * disabled provider — so the existing safe behaviors (uniform
   * «Способ входа недоступен», no provider request, `oauth=disabled`
   * redirect) keep working unchanged.
   */
  async getOAuthConfiguration(
    configKey: 'yandex' | 'vk',
  ): Promise<OAuthProviderConfiguration> {
    const spec = INTEGRATION_SPECS[configKey.toUpperCase() as 'YANDEX' | 'VK'];
    const oauthSpec = spec.oauth;
    if (!oauthSpec) {
      // Registry guarantees `oauth` for the OAuth providers; this is a
      // hard programming-error guard, not a runtime path.
      throw new Error(`No OAuth runtime wiring for ${configKey}`);
    }
    const envConfig = this.readEnvConfig(oauthSpec);

    // ENV fallback: documented backwards compatibility, ONLY while no DB
    // row exists. As soon as an admin creates the integration, the DB is
    // authoritative — including its "disabled" decision.
    const row = await this.prisma.integration
      .findUnique({ where: { provider: spec.provider } })
      .catch(() => null);
    if (!row) {
      return envConfig;
    }
    return this.fromDbRow(row, oauthSpec, envConfig);
  }

  /**
   * The DB row exists → DB is authoritative: `enabled=false` NEVER falls
   * back to ENV, and an incomplete configuration NEVER falls back either
   * (otherwise a stale ENV credential could silently override an admin's
   * decision). Both resolve to the uniform all-empty "disabled" shape.
   * A config rotation between start and callback only risks a failed token
   * exchange (provider rejects the mismatch) — state/PKCE checks are
   * unaffected, so no security compromise is involved.
   */
  private fromDbRow(
    row: Integration,
    oauthSpec: IntegrationOAuthSpec,
    envConfig: OAuthProviderConfiguration,
  ): OAuthProviderConfiguration {
    if (!row.enabled) {
      return this.disabledShape(envConfig);
    }
    const config = readStringBag(row.config);
    const clientId = config['clientId'] ?? '';
    const redirectUri = config['redirectUri'] ?? '';
    // Only the secrets the current flow really needs are decrypted, into
    // server memory — never the whole secrets bag, never logged.
    const runtimeSecrets: Record<string, string> = {};
    for (const name of oauthSpec.runtimeSecrets) {
      runtimeSecrets[name] = this.decryptRuntimeSecret(row, name);
    }
    const complete =
      clientId !== '' &&
      redirectUri !== '' &&
      oauthSpec.runtimeSecrets.every((name) => runtimeSecretsNotEmpty(runtimeSecrets, name));
    if (!complete) {
      this.logger.warn(
        `${oauthSpec.configKey}: integration is enabled in the DB but incomplete — OAuth stays disabled (no ENV fallback)`,
      );
      return this.disabledShape(envConfig);
    }
    return {
      clientId,
      clientSecret: runtimeSecrets['clientSecret'] ?? '',
      redirectUri,
      authorizeEndpoint: envConfig.authorizeEndpoint,
      scope: envConfig.scope,
    };
  }

  /** Decrypts on demand; any failure (tampered envelope, rotated vault
   * key) makes the integration incomplete — a safe disabled outcome,
   * never a leaked or half-working secret. Never logs the value. */
  private decryptRuntimeSecret(row: Integration, name: string): string {
    const envelope = readStringBag(row.secrets)[name];
    if (typeof envelope !== 'string' || envelope === '') {
      return '';
    }
    try {
      return this.secretService.decrypt(envelope);
    } catch {
      this.logger.error(
        `${row.provider}: secret ${name} cannot be decrypted (vault key rotated or envelope corrupted) — the integration is treated as incomplete`,
      );
      return '';
    }
  }

  /** Fixed official endpoints/scope from the app configuration (never
   * admin-editable); empty strings keep the disabled shape uniform. */
  private readEnvConfig(
    oauthSpec: IntegrationOAuthSpec,
  ): OAuthProviderConfiguration {
    return (
      this.configService.get<AppConfiguration['oauth']>('oauth')?.[
        oauthSpec.configKey
      ] ?? {
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        authorizeEndpoint: '',
        scope: '',
      }
    );
  }

  /** All-empty configuration: the exact shape the ENV flow used for a
   * disabled provider, so existing guards (`isEnabled`, start-endpoint
   * redirect, uniform errors) keep working unchanged. */
  private disabledShape(envConfig: OAuthProviderConfiguration): OAuthProviderConfiguration {
    return {
      clientId: '',
      clientSecret: '',
      redirectUri: '',
      authorizeEndpoint: envConfig.authorizeEndpoint,
      scope: envConfig.scope,
    };
  }
}

function runtimeSecretsNotEmpty(
  secrets: Record<string, string>,
  name: string,
): boolean {
  const value = secrets[name];
  return typeof value === 'string' && value !== '';
}
