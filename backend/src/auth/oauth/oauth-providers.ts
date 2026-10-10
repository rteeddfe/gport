import type { OAuthProvider } from '../../generated/prisma/client.js';
import type { OAuthProviderConfiguration } from '../../config/configuration.js';

/** Route segment -> Prisma enum. The provider always comes from the URL
 * route, never from frontend input (provider mix-up protection). */
const PROVIDER_KEYS = {
  yandex: 'YANDEX',
  vk: 'VK',
} as const satisfies Record<string, OAuthProvider>;

export type OAuthProviderKey = keyof typeof PROVIDER_KEYS;

export function fromRoute(value: string): OAuthProviderKey | null {
  return value in PROVIDER_KEYS ? (value as OAuthProviderKey) : null;
}

export function toProvider(key: OAuthProviderKey): OAuthProvider {
  return PROVIDER_KEYS[key];
}

/** Is the provider configured (env filled) and therefore usable? */
export function isEnabled(config: OAuthProviderConfiguration): boolean {
  return config.clientId !== '' && config.clientSecret !== '' && config.redirectUri !== '';
}

/** Builds the provider authorize redirect: authorization code + state +
 * PKCE S256 (both providers support PKCE; VK requires it). The
 * redirect_uri ALWAYS comes from the resolved configuration (DB-first,
 * ENV fallback), never from a request. */
export function authorizeUrl(
  config: OAuthProviderConfiguration,
  options: { state: string; codeChallenge: string },
): string {
  const url = new URL(config.authorizeEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', options.state);
  url.searchParams.set('code_challenge', options.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}
