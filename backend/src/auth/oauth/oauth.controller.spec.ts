import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import { OAuthController } from './oauth.controller.js';
import { OAuthStateService } from './oauth-state.service.js';

function makeConfigService() {
  return {
    get: (key: string) =>
      ({
        storefrontOrigin: 'http://localhost:3000',
        corsOrigins: ['http://localhost:3000'],
        cookieSameSite: 'Lax',
        oauth: {
          yandex: {
            clientId: 'test-yandex-client',
            clientSecret: 'test-yandex-secret',
            redirectUri: 'http://localhost:3001/api/auth/oauth/yandex/callback',
            authorizeEndpoint: 'https://oauth.yandex.ru/authorize',
            scope: 'login:info login:email',
          },
          vk: {
            clientId: '',
            clientSecret: '',
            redirectUri: '',
            authorizeEndpoint: '',
            scope: '',
          },
        },
      })[key],
  };
}

function makeController() {
  const yandex = {
    isEnabled: vi.fn().mockReturnValue(true),
    authorizeUrl: vi
      .fn()
      .mockReturnValue('https://oauth.yandex.ru/authorize?state=s'),
    exchangeCode: vi.fn().mockResolvedValue('ya-token'),
    fetchIdentity: vi
      .fn()
      .mockResolvedValue({ providerUserId: 'ya-42', email: 'buyer@yandex.ru' }),
  };
  const vk = {
    isEnabled: vi.fn().mockReturnValue(true),
    authorizeUrl: vi.fn().mockReturnValue('https://id.vk.ru/authorize?state=s'),
    parseCallback: vi
      .fn()
      .mockReturnValue({ code: 'vk-code', state: 'vk-state', deviceId: 'vk-dev' }),
    exchangeCode: vi.fn().mockResolvedValue('vk-token'),
    fetchIdentity: vi
      .fn()
      .mockResolvedValue({ providerUserId: 'vk-77', email: 'buyer@mail.ru' }),
  };
  const authService = {
    oauthLogin: vi.fn().mockResolvedValue({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      user: { id: 'u1', email: 'buyer@yandex.ru' },
    }),
  };
  const controller = new OAuthController(
    new OAuthStateService(),
    yandex as never,
    vk as never,
    authService as never,
    makeConfigService() as never,
  );
  return {
    controller,
    yandex,
    vk,
    authService,
    response: { setHeader: vi.fn(), redirect: vi.fn() },
  };
}

function requestWithCookies(setCookies: string[]) {
  const header = setCookies.map((c) => c.split(';')[0]).join('; ');
  return { headers: { cookie: header } };
}

describe('OAuthController — Yandex (M-OAUTH-2)', () => {
  const cookieOptions = { secure: false, sameSite: 'Lax' as const };

  it('start redirects to the Yandex authorize URL with fresh state/PKCE cookies', async () => {
    const { controller, yandex, response } = makeController();

    await controller.yandexStart(response as never);

    const [cookieHeader] = response.setHeader.mock.calls[0][1];
    expect(cookieHeader).toContain('oauth_state_yandex=');
    const [status, location] = response.redirect.mock.calls[0];
    expect(status).toBe(302);
    expect(location).toBe('https://oauth.yandex.ru/authorize?state=s');
    // The URL builder owns redirect_uri (server config) — the controller
    // only passes state + challenge.
    expect(yandex.authorizeUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.any(String),
        codeChallenge: expect.any(String),
      }),
    );
  });

  it('start with a disabled provider redirects controlled, without issuing cookies', async () => {
    const { controller, yandex, response } = makeController();
    yandex.isEnabled.mockReturnValue(false);

    await controller.yandexStart(response as never);

    expect(response.setHeader).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=disabled',
    );
  });

  it('callback clears the oauth cookies before any other logic', async () => {
    const { controller, yandex, response } = makeController();
    yandex.exchangeCode.mockRejectedValue(new Error('boom'));

    await controller.yandexCallback(
      { headers: { cookie: '' } } as never,
      response as never,
      'code',
      'no-such-state',
    );

    const firstSetCookie = response.setHeader.mock.calls[0][1];
    expect(
      firstSetCookie.some((c: string) => c.startsWith('oauth_state_yandex=;')),
    ).toBe(true);
    expect(
      firstSetCookie.some((c: string) => c.startsWith('oauth_pkce_yandex=;')),
    ).toBe(true);
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=failed',
    );
  });

  it('callback fails controlled on a provider error or a missing code', async () => {
    const { controller, yandex, response } = makeController();

    await controller.yandexCallback(
      { headers: {} } as never,
      response as never,
      undefined,
      undefined,
      'access_denied',
    );
    expect(yandex.exchangeCode).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=failed',
    );

    const response2 = { setHeader: vi.fn(), redirect: vi.fn() };
    await controller.yandexCallback(
      { headers: {} } as never,
      response2 as never,
      undefined,
      'state',
    );
    expect(yandex.exchangeCode).not.toHaveBeenCalled();
    expect(response2.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=failed',
    );
  });

  it('callback rejects a wrong or foreign-provider state without exchanging the code', async () => {
    const { controller, yandex, response } = makeController();

    // Valid VK-bound state on the Yandex route.
    const vkCookies = new OAuthStateService().issue('VK', cookieOptions);
    await controller.yandexCallback(
      requestWithCookies(vkCookies.setCookies) as never,
      response as never,
      'code',
      vkCookies.state,
    );
    expect(yandex.exchangeCode).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=failed',
    );

    // Valid Yandex state with a tampered value.
    const yaCookies = new OAuthStateService().issue('YANDEX', cookieOptions);
    const response2 = { setHeader: vi.fn(), redirect: vi.fn() };
    await controller.yandexCallback(
      requestWithCookies(yaCookies.setCookies) as never,
      response2 as never,
      'code',
      `${yaCookies.state}x`,
    );
    expect(yandex.exchangeCode).not.toHaveBeenCalled();
  });

  it('a successful login sets session cookies and redirects to the dashboard', async () => {
    const { controller, authService, response } = makeController();

    const cookies = new OAuthStateService().issue('YANDEX', cookieOptions);
    await controller.yandexCallback(
      requestWithCookies(cookies.setCookies) as never,
      response as never,
      'code',
      cookies.state,
    );

    expect(authService.oauthLogin).toHaveBeenCalledWith(
      'YANDEX',
      'ya-42',
      'buyer@yandex.ru',
    );
    const sessionCookies = response.setHeader.mock.calls.at(-1)[1];
    expect(sessionCookies.some((c: string) => c.startsWith('access_token='))).toBe(
      true,
    );
    expect(sessionCookies.some((c: string) => c.startsWith('refresh_token='))).toBe(
      true,
    );
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/dashboard',
    );
  });

  it('an existing GPort user redirects to the linking notice with the opaque challenge id', async () => {
    const { controller, authService, response } = makeController();
    authService.oauthLogin.mockResolvedValue({
      verificationRequired: true,
      linkChallengeId: 'ch-1',
    });

    const cookies = new OAuthStateService().issue('YANDEX', cookieOptions);
    await controller.yandexCallback(
      requestWithCookies(cookies.setCookies) as never,
      response as never,
      'code',
      cookies.state,
    );

    const lastCookies = response.setHeader.mock.calls.at(-1)[1];
    expect(lastCookies.some((c: string) => c.startsWith('access_token='))).toBe(false);
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=link&challenge=ch-1',
    );
  });

  it('a missing provider email surfaces the email notice', async () => {
    const { controller, authService, response } = makeController();
    authService.oauthLogin.mockRejectedValue(
      new BadRequestException('no email'),
    );

    const cookies = new OAuthStateService().issue('YANDEX', cookieOptions);
    await controller.yandexCallback(
      requestWithCookies(cookies.setCookies) as never,
      response as never,
      'code',
      cookies.state,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=email',
    );
  });

  it('POST /oauth/link/verify issues the session on a correct code', async () => {
    const { controller, authService, response } = makeController();
    authService.verifyLink = vi.fn().mockResolvedValue({
      accessToken: 'jwt-access',
      refreshToken: 'jwt-refresh',
      user: { id: 'u1', email: 'buyer@example.com' },
    });

    const result = await controller.verifyLink(
      { challengeId: 'ch-1', code: '123456' },
      response as never,
    );

    expect(authService.verifyLink).toHaveBeenCalledWith('ch-1', '123456');
    const sessionCookies = response.setHeader.mock.calls.at(-1)[1];
    expect(sessionCookies.some((c: string) => c.startsWith('access_token='))).toBe(true);
    expect(result).toHaveProperty('user.email', 'buyer@example.com');
  });

  it('verifyLink failures surface as a uniform rejection without cookies', async () => {
    const { controller, authService } = makeController();
    authService.verifyLink = vi
      .fn()
      .mockRejectedValue(new BadRequestException('Код недействителен или истёк'));
    const response = { setHeader: vi.fn() };

    await expect(
      controller.verifyLink(
        { challengeId: 'ch-1', code: '000000' },
        response as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('OAuthController — VK (M-OAUTH-3)', () => {
  const cookieOptions = { secure: false, sameSite: 'Lax' as const };

  it('start redirects to the VK authorize URL with VK-bound state/PKCE cookies', async () => {
    const { controller, response } = makeController();

    await controller.vkStart(response as never);

    const cookies = response.setHeader.mock.calls[0][1];
    expect(cookies[0]).toContain('oauth_state_vk=');
    expect(cookies[1]).toContain('oauth_pkce_vk=');
    const [status, location] = response.redirect.mock.calls[0];
    expect(status).toBe(302);
    expect(location).toBe('https://id.vk.ru/authorize?state=s');
  });

  it('start with a disabled VK provider redirects controlled, without cookies', async () => {
    const { controller, vk, response } = makeController();
    vk.isEnabled.mockReturnValue(false);

    await controller.vkStart(response as never);

    expect(response.setHeader).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=disabled',
    );
  });

  it('callback parses the payload and logs the user in with the VK identity', async () => {
    const { controller, vk, authService, response } = makeController();
    const cookies = new OAuthStateService().issue('VK', cookieOptions);
    const payload = JSON.stringify({
      code: 'vk-code',
      state: cookies.state,
      type: 'code_v2',
      device_id: 'vk-dev',
    });
    // The mocked adapter parses the real payload (as the adapter maps it)
    // so the state matches the cookie issued above.
    vk.parseCallback.mockImplementation((p: string) => {
      const parsed = JSON.parse(p) as {
        code: string;
        state: string;
        device_id?: string;
      };
      return { code: parsed.code, state: parsed.state, deviceId: parsed.device_id ?? null };
    });

    await controller.vkCallback(
      requestWithCookies(cookies.setCookies) as never,
      response as never,
      payload,
    );

    expect(vk.parseCallback).toHaveBeenCalledWith(payload);
    expect(vk.exchangeCode).toHaveBeenCalledWith(
      'vk-code',
      expect.any(String),
      'vk-dev',
      cookies.state,
    );
    expect(authService.oauthLogin).toHaveBeenCalledWith('VK', 'vk-77', 'buyer@mail.ru');
    const sessionCookies = response.setHeader.mock.calls.at(-1)[1];
    expect(sessionCookies.some((c: string) => c.startsWith('access_token='))).toBe(true);
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/dashboard',
    );
  });

  it('callback clears the VK cookies first on every outcome', async () => {
    const { controller, response } = makeController();

    await controller.vkCallback(
      { headers: { cookie: '' } } as never,
      response as never,
      'malformed',
    );

    const firstSetCookie = response.setHeader.mock.calls[0][1];
    expect(
      firstSetCookie.some((c: string) => c.startsWith('oauth_state_vk=;')),
    ).toBe(true);
    expect(
      firstSetCookie.some((c: string) => c.startsWith('oauth_pkce_vk=;')),
    ).toBe(true);
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=failed',
    );
  });

  it('callback rejects a missing, tampered or foreign-provider state', async () => {
    const { controller, vk, response } = makeController();

    // No payload at all.
    await controller.vkCallback({ headers: {} } as never, response as never, undefined);
    expect(vk.exchangeCode).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=failed',
    );

    // Valid VK cookies but a tampered state inside the payload.
    const cookies = new OAuthStateService().issue('VK', cookieOptions);
    const response2 = { setHeader: vi.fn(), redirect: vi.fn() };
    const payload = JSON.stringify({ code: 'c', state: `${cookies.state}x` });
    await controller.vkCallback(
      requestWithCookies(cookies.setCookies) as never,
      response2 as never,
      payload,
    );
    expect(vk.exchangeCode).not.toHaveBeenCalled();

    // Valid Yandex-bound state on the VK route (provider mix-up).
    const yaCookies = new OAuthStateService().issue('YANDEX', cookieOptions);
    const response3 = { setHeader: vi.fn(), redirect: vi.fn() };
    const payload3 = JSON.stringify({ code: 'c', state: yaCookies.state });
    await controller.vkCallback(
      requestWithCookies(yaCookies.setCookies) as never,
      response3 as never,
      payload3,
    );
    expect(vk.exchangeCode).not.toHaveBeenCalled();
    expect(response3.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=failed',
    );
  });

  it('an existing GPort user redirects to the linking notice with the opaque challenge id', async () => {
    const { controller, vk, authService, response } = makeController();
    authService.oauthLogin.mockResolvedValue({
      verificationRequired: true,
      linkChallengeId: 'ch-1',
    });

    const cookies = new OAuthStateService().issue('VK', cookieOptions);
    const payload = JSON.stringify({ code: 'c', state: cookies.state, type: 'code_v2' });
    vk.parseCallback.mockImplementation((p: string) => JSON.parse(p));
    await controller.vkCallback(
      requestWithCookies(cookies.setCookies) as never,
      response as never,
      payload,
    );

    const lastCookies = response.setHeader.mock.calls.at(-1)[1];
    expect(lastCookies.some((c: string) => c.startsWith('access_token='))).toBe(false);
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=link&challenge=ch-1',
    );
  });

  it('a missing provider email surfaces the email notice', async () => {
    const { controller, vk, authService, response } = makeController();
    authService.oauthLogin.mockRejectedValue(new BadRequestException('no email'));

    const cookies = new OAuthStateService().issue('VK', cookieOptions);
    const payload = JSON.stringify({ code: 'c', state: cookies.state });
    vk.parseCallback.mockImplementation((p: string) => JSON.parse(p));
    await controller.vkCallback(
      requestWithCookies(cookies.setCookies) as never,
      response as never,
      payload,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:3000/sign-in?oauth=email',
    );
  });
});
