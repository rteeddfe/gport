import { UnauthorizedException } from '@nestjs/common';
import { vi } from 'vitest';
import { YandexOAuthService } from './yandex-oauth.service.js';
import type { OAuthProviderConfiguration } from '../../config/configuration.js';

const CONFIG: OAuthProviderConfiguration = {
  clientId: 'test-yandex-client',
  clientSecret: 'test-yandex-secret',
  redirectUri: 'http://localhost:3001/api/auth/oauth/yandex/callback',
  authorizeEndpoint: 'https://oauth.yandex.ru/authorize',
  scope: 'login:info login:email',
};

/** M-INTEGRATIONS-2: the adapter receives its configuration from
 * IntegrationRuntimeService (DB-first, ENV fallback) — the spec mocks the
 * runtime boundary, mirroring what a DB-configured provider resolves to. */
function makeService() {
  const runtime = {
    getOAuthConfiguration: vi.fn(async () => CONFIG),
  };
  return new YandexOAuthService(runtime as never);
}

function fetchMock(handler: (input: RequestInfo, init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo, init?: RequestInit) => handler(input, init));
}

const tokenResponse = () =>
  new Response(JSON.stringify({ access_token: 'ya-token', refresh_token: 'drop-me' }), {
    status: 200,
  });

describe('YandexOAuthService (M-OAUTH-2)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('authorizeUrl builds the documented authorize URL from server-side config', async () => {
    const url = new URL(
      await makeService().authorizeUrl({ state: 's1', codeChallenge: 'c1' }),
    );
    expect(url.origin + url.pathname).toBe('https://oauth.yandex.ru/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('test-yandex-client');
    expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(url.searchParams.get('scope')).toBe('login:info login:email');
    expect(url.searchParams.get('state')).toBe('s1');
    expect(url.searchParams.get('code_challenge')).toBe('c1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('exchangeCode posts the documented parameters and returns only the access token', async () => {
    const fetch = fetchMock(() => tokenResponse());
    vi.stubGlobal('fetch', fetch);
    const token = await makeService().exchangeCode('the-code', 'the-verifier');

    expect(token).toBe('ya-token');
    const [, init] = fetch.mock.calls[0];
    expect(init?.method).toBe('POST');
    const body = new URLSearchParams(init?.body as URLSearchParamsInit);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('the-code');
    expect(body.get('client_id')).toBe('test-yandex-client');
    expect(body.get('client_secret')).toBe('test-yandex-secret');
    expect(body.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(body.get('code_verifier')).toBe('the-verifier');
    // No stray state/scope in the token exchange.
    expect(body.get('state')).toBeNull();
  });

  it('exchangeCode fails uniformly on transport or provider errors', async () => {
    vi.stubGlobal('fetch', fetchMock(() => new Response('{}', { status: 400 })));
    await expect(makeService().exchangeCode('c', 'v')).rejects.toThrow(
      UnauthorizedException,
    );
    vi.stubGlobal(
      'fetch',
      fetchMock(() => {
        throw new Error('network down');
      }),
    );
    await expect(makeService().exchangeCode('c', 'v')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('fetchIdentity maps the documented fields and reports a missing email as null', async () => {
    const fetch = fetchMock(() =>
      new Response(
        JSON.stringify({ id: 'ya-user-42', default_email: 'buyer@yandex.ru' }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetch);
    const identity = await makeService().fetchIdentity('ya-token');

    expect(identity).toEqual({
      providerUserId: 'ya-user-42',
      email: 'buyer@yandex.ru',
    });
    const [input, init] = fetch.mock.calls[0];
    expect(input).toBe('https://login.yandex.ru/info');
    expect((init?.headers as Record<string, string>)?.Authorization).toBe(
      'OAuth ya-token',
    );

    vi.stubGlobal(
      'fetch',
      fetchMock(() => new Response(JSON.stringify({ id: 'ya-user-42' }), { status: 200 })),
    );
    expect((await makeService().fetchIdentity('t')).email).toBeNull();
  });

  it('fetchIdentity fails uniformly without the stable id field', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(() => new Response(JSON.stringify({ login: 'x' }), { status: 200 })),
    );
    await expect(makeService().fetchIdentity('t')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('a disabled or incomplete runtime configuration never reaches the provider (M-INTEGRATIONS-2)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const runtime = {
      getOAuthConfiguration: vi.fn(async () => ({
        ...CONFIG,
        clientId: '',
        clientSecret: '',
        redirectUri: '',
      })),
    };
    const service = new YandexOAuthService(runtime as never);
    expect(await service.isEnabled()).toBe(false);
    await expect(service.exchangeCode('c', 'v')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('the token exchange uses the runtime-resolved (DB or ENV) credentials', async () => {
    const fetchSpy = fetchMock(() => tokenResponse());
    vi.stubGlobal('fetch', fetchSpy);
    await makeService().exchangeCode('the-code', 'the-verifier');
    const [, init] = fetchSpy.mock.calls[0];
    const body = new URLSearchParams(init?.body as URLSearchParamsInit);
    // Exactly the runtime config's decrypted secret — nothing else.
    expect(body.get('client_id')).toBe('test-yandex-client');
    expect(body.get('client_secret')).toBe('test-yandex-secret');
  });
});
