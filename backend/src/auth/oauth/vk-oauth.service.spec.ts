import { UnauthorizedException } from '@nestjs/common';
import { vi } from 'vitest';
import { VkOAuthService } from './vk-oauth.service.js';
import type { OAuthProviderConfiguration } from '../../config/configuration.js';

const CONFIG: OAuthProviderConfiguration = {
  clientId: 'test-vk-client',
  clientSecret: 'test-vk-secret-held-unused',
  redirectUri: 'http://localhost/api/auth/oauth/vk/callback',
  authorizeEndpoint: 'https://id.vk.ru/authorize',
  scope: 'email',
};

/** M-INTEGRATIONS-2: the adapter receives its configuration from
 * IntegrationRuntimeService (DB-first, ENV fallback) — the spec mocks the
 * runtime boundary. VK's flow requires no client secret, so the runtime
 * config for VK carries none even when the vault holds one. */
function makeService() {
  const runtime = {
    getOAuthConfiguration: vi.fn(async () => CONFIG),
  };
  return new VkOAuthService(runtime as never);
}

function fetchMock(handler: () => Response | Promise<Response>) {
  return vi.fn(async () => handler());
}

describe('VkOAuthService (M-OAUTH-3)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('authorizeUrl builds the documented VK authorize URL from server-side config', async () => {
    const url = new URL(
      await makeService().authorizeUrl({ state: 's1', codeChallenge: 'c1' }),
    );
    expect(url.origin + url.pathname).toBe('https://id.vk.ru/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('test-vk-client');
    expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(url.searchParams.get('scope')).toBe('email');
    expect(url.searchParams.get('state')).toBe('s1');
    expect(url.searchParams.get('code_challenge')).toBe('c1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('parseCallback reads the documented payload JSON (code/state/type/device_id)', () => {
    const payload = JSON.stringify({
      code: 'vk-code',
      state: 's'.repeat(32),
      type: 'code_v2',
      device_id: 'dev-1',
    });
    expect(makeService().parseCallback(payload)).toEqual({
      code: 'vk-code',
      state: 's'.repeat(32),
      deviceId: 'dev-1',
    });
  });

  it('parseCallback fails uniformly on absence, malformed JSON or missing fields', () => {
    const service = makeService();
    expect(() => service.parseCallback(undefined)).toThrow(UnauthorizedException);
    expect(() => service.parseCallback('not-json')).toThrow(UnauthorizedException);
    expect(() => makeService().parseCallback(JSON.stringify({ state: 'x' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('exchangeCode posts the documented parameters (no client_secret) and returns the token', async () => {
    const fetch = fetchMock(() =>
      new Response(JSON.stringify({ access_token: 'vk-token', refresh_token: 'drop-me' }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const token = await makeService().exchangeCode(
      'vk-code',
      'the-verifier',
      'dev-1',
      'the-state',
    );

    expect(token).toBe('vk-token');
    const [input, init] = fetch.mock.calls[0];
    expect(input).toBe('https://id.vk.ru/oauth2/auth');
    expect(init?.method).toBe('POST');
    const body = new URLSearchParams(init?.body as URLSearchParamsInit);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('vk-code');
    expect(body.get('client_id')).toBe('test-vk-client');
    expect(body.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(body.get('code_verifier')).toBe('the-verifier');
    expect(body.get('device_id')).toBe('dev-1');
    expect(body.get('state')).toBe('the-state');
    // The documented exchange carries NO client_secret (PKCE-only).
    expect(body.get('client_secret')).toBeNull();
  });

  it('exchangeCode omits device_id when the payload had none, and fails uniformly on errors', async () => {
    const fetch = fetchMock(() =>
      new Response(JSON.stringify({ access_token: 'vk-token' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetch);
    await makeService().exchangeCode('c', 'v', null, 'st');
    const body = new URLSearchParams(fetch.mock.calls[0][1].body as URLSearchParamsInit);
    expect(body.get('device_id')).toBeNull();

    vi.stubGlobal('fetch', fetchMock(() => new Response('{}', { status: 401 })));
    await expect(makeService().exchangeCode('c', 'v', null, 's')).rejects.toThrow(
      UnauthorizedException,
    );
    vi.stubGlobal(
      'fetch',
      fetchMock(() => {
        throw new Error('network down');
      }),
    );
    await expect(makeService().exchangeCode('c', 'v', null, 's')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('fetchIdentity maps user.user_id (string or number) and treats a missing email as null', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(() =>
        new Response(
          JSON.stringify({ user: { user_id: 12345, email: 'buyer@mail.ru' } }),
          { status: 200 },
        ),
      ),
    );
    expect(await makeService().fetchIdentity('vk-token')).toEqual({
      providerUserId: '12345',
      email: 'buyer@mail.ru',
    });

    vi.stubGlobal(
      'fetch',
      fetchMock(() =>
        new Response(JSON.stringify({ user: { user_id: 12345 } }), { status: 200 }),
      ),
    );
    expect((await makeService().fetchIdentity('t')).email).toBeNull();
  });

  it('fetchIdentity fails uniformly without the stable user_id field', async () => {
    vi.stubGlobal(
      'fetch',
      fetchMock(() => new Response(JSON.stringify({ user: { first_name: 'x' } }), { status: 200 })),
    );
    await expect(makeService().fetchIdentity('t')).rejects.toThrow(
      UnauthorizedException,
    );
    vi.stubGlobal(
      'fetch',
      fetchMock(() => new Response(JSON.stringify({ error: 'invalid_client' }), { status: 400 })),
    );
    await expect(makeService().fetchIdentity('t')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('an incomplete runtime configuration never reaches the provider (M-INTEGRATIONS-2)', async () => {
    const fetchSpy = fetchMock(
      () =>
        new Response(JSON.stringify({ access_token: 'vk-token' }), {
          status: 200,
        }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const runtime = {
      getOAuthConfiguration: vi.fn(async () => ({
        ...CONFIG,
        clientId: '',
        redirectUri: '',
      })),
    };
    const service = new VkOAuthService(runtime as never);
    expect(await service.isEnabled()).toBe(false);
    await expect(
      service.exchangeCode('c', 'v', null, 'st'),
    ).rejects.toThrow(UnauthorizedException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('the token exchange never carries a client_secret (VK code_v2 + PKCE)', async () => {
    const fetchSpy = fetchMock(
      () =>
        new Response(JSON.stringify({ access_token: 'vk-token' }), {
          status: 200,
        }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    await makeService().exchangeCode('c', 'v', 'dev', 'st');
    const [, init] = fetchSpy.mock.calls[0];
    const body = new URLSearchParams(init?.body as URLSearchParamsInit);
    expect(body.get('client_secret')).toBeNull();
  });
});
