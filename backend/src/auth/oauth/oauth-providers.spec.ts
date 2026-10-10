import {
  authorizeUrl,
  fromRoute,
  isEnabled,
  toProvider,
} from './oauth-providers.js';
import type { OAuthProviderConfiguration } from '../../config/configuration.js';

const YANDEX_CONFIG: OAuthProviderConfiguration = {
  clientId: 'test-yandex-client',
  clientSecret: 'test-yandex-secret',
  redirectUri: 'http://localhost:3001/api/auth/oauth/yandex/callback',
  authorizeEndpoint: 'https://oauth.yandex.ru/authorize',
  scope: 'login:info login:email',
};

describe('oauth provider foundation (M-OAUTH-1)', () => {
  it('builds the authorize URL with code + state + PKCE S256 and the configured redirect_uri', () => {
    const url = new URL(
      authorizeUrl(YANDEX_CONFIG, {
        state: 'state-value',
        codeChallenge: 'challenge-value',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://oauth.yandex.ru/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('test-yandex-client');
    // Server-side redirect_uri only — the request can never supply one.
    expect(url.searchParams.get('redirect_uri')).toBe(YANDEX_CONFIG.redirectUri);
    expect(url.searchParams.get('scope')).toBe('login:info login:email');
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-value');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('maps route segments to providers and rejects unknown ones', () => {
    expect(fromRoute('yandex')).toBe('yandex');
    expect(fromRoute('vk')).toBe('vk');
    expect(fromRoute('google')).toBeNull();
    expect(toProvider('yandex')).toBe('YANDEX');
    expect(toProvider('vk')).toBe('VK');
  });

  it('treats a provider as enabled only with id, secret and redirect URI', () => {
    expect(isEnabled(YANDEX_CONFIG)).toBe(true);
    expect(isEnabled({ ...YANDEX_CONFIG, clientId: '' })).toBe(false);
    expect(isEnabled({ ...YANDEX_CONFIG, redirectUri: '' })).toBe(false);
  });

  // providerConfiguration (ENV reader) moved into IntegrationRuntimeService
  // in M-INTEGRATIONS-2 — its ENV-fallback behavior is covered there
  // (integration-runtime.service.spec.ts).
});
