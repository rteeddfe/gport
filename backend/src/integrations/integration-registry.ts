import type { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from '../config/configuration.js';
import type { IntegrationProvider, IntegrationType } from '../generated/prisma/client.js';

export interface IntegrationFieldSpec {
  /** Field name as stored in the Integration.config / .secrets JSON. */
  name: string;
  /** Admin-facing label (ru). */
  label: string;
}

/**
 * Runtime requirements of one OAuth integration (the CURRENT login flow).
 * The registry is the single source of truth: no provider-specific
 * "requires secret" rule lives anywhere else. Endpoints and scope stay
 * fixed official values from the app configuration (configuration.ts) —
 * only credentials live in the DB.
 */
export interface IntegrationOAuthSpec {
  /** configuration.ts key: the ENV fallback source + fixed endpoints. */
  configKey: 'yandex' | 'vk';
  /** Secret fields the runtime flow ACTUALLY uses (decrypted on demand,
   * server memory only). VK's code_v2 + PKCE token exchange carries no
   * client_secret — its list is empty on purpose. */
  runtimeSecrets: string[];
}

/**
 * Static shape of one integration provider (M-INTEGRATIONS). The DB row is
 * shape-stable (config/secrets JSON bags); everything provider-specific
 * lives here, so a new integration is a single registry entry + enum value.
 * Secret field names must never appear in `configFields` and vice versa —
 * the service enforces this on every write.
 */
export interface IntegrationSpec {
  provider: IntegrationProvider;
  type: IntegrationType;
  /** Admin UI title/description (Russian). */
  title: string;
  description: string;
  /** Required non-secret configuration fields. For OAuth this includes the
   * redirect URI — backend-controlled, see `configValidators`. */
  configFields: IntegrationFieldSpec[];
  /** Encrypted-at-rest secret fields REQUIRED for the integration to be
   * configured (never returned by the API). */
  secretFields: IntegrationFieldSpec[];
  /** Encrypted-at-rest secrets that MAY be stored but are not required by
   * the current flow (kept for future ones). Never returned by the API. */
  optionalSecretFields?: IntegrationFieldSpec[];
  /** Value validators for select config fields — enforced on every write;
   * a rejected value is never stored, so it can never reach the runtime. */
  configValidators?: Record<
    string,
    (value: string, configService: ConfigService) => string | null
  >;
  /** Runtime wiring of an OAuth provider (M-INTEGRATIONS-2). */
  oauth?: IntegrationOAuthSpec;
}

/**
 * The OAuth redirect URI is stored in the DB (M-INTEGRATIONS-2) but is
 * NEVER an arbitrary URL: the value must be exactly
 * `<allowed-origin>/api/auth/oauth/<provider>/callback` where the allowed
 * origins are the ENV-registered redirect URI itself plus the storefront
 * and CORS origins. Enforced on write (admin save) and re-checked on
 * read (runtime) — a mismatch makes the integration incomplete.
 */
export function oauthRedirectUriValidator(
  configKey: 'yandex' | 'vk',
): (value: string, configService: ConfigService) => string | null {
  const suffix = `/api/auth/oauth/${configKey}/callback`;
  return (value, configService) => {
    const allowed = new Set<string>();
    const envUri =
      configService.get<AppConfiguration['oauth']>('oauth')?.[configKey]
        .redirectUri ?? '';
    if (envUri !== '') {
      allowed.add(envUri);
    }
    const storefront = configService.get<string>('storefrontOrigin') ?? '';
    if (storefront !== '') {
      allowed.add(`${storefront}${suffix}`);
    }
    for (const origin of configService.get<string[]>('corsOrigins') ?? []) {
      allowed.add(`${origin}${suffix}`);
    }
    return allowed.has(value)
      ? null
      : `Redirect URI должен быть callback-URL вида <домен>/api/auth/oauth/${configKey}/callback для одного из разрешённых origin приложения`;
  };
}

export const INTEGRATION_SPECS: Record<IntegrationProvider, IntegrationSpec> = {
  YANDEX: {
    provider: 'YANDEX',
    type: 'OAUTH',
    title: 'Yandex OAuth',
    description: 'Вход пользователей через Яндекс ID',
    configFields: [
      { name: 'clientId', label: 'Client ID' },
      { name: 'redirectUri', label: 'Redirect URI' },
    ],
    secretFields: [{ name: 'clientSecret', label: 'Client Secret' }],
    configValidators: { redirectUri: oauthRedirectUriValidator('yandex') },
    oauth: { configKey: 'yandex', runtimeSecrets: ['clientSecret'] },
  },
  VK: {
    provider: 'VK',
    type: 'OAUTH',
    title: 'VK OAuth',
    description: 'Вход пользователей через VK ID',
    configFields: [
      { name: 'clientId', label: 'Client ID' },
      { name: 'redirectUri', label: 'Redirect URI' },
    ],
    secretFields: [],
    optionalSecretFields: [{ name: 'clientSecret', label: 'Client Secret' }],
    configValidators: { redirectUri: oauthRedirectUriValidator('vk') },
    oauth: { configKey: 'vk', runtimeSecrets: [] },
  },
};

export const INTEGRATION_PROVIDER_NAMES = Object.keys(
  INTEGRATION_SPECS,
) as IntegrationProvider[];

/** Route-segment ↔ enum mapping, mirroring fromRoute/toProvider of the
 * OAuth module (lowercase route segment, e.g. "yandex" → "YANDEX"). */
export function integrationFromRoute(route: string): IntegrationProvider | null {
  const provider = route.toUpperCase() as IntegrationProvider;
  return provider in INTEGRATION_SPECS ? provider : null;
}
