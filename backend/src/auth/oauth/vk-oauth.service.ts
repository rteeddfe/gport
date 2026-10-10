import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { OAuthProviderConfiguration } from '../../config/configuration.js';
import { IntegrationRuntimeService } from '../../integrations/integration-runtime.service.js';
import { authorizeUrl } from './oauth-providers.js';

/** VK ID adapter (M-OAUTH-3), per the official docs:
 * - authorize: https://id.vk.ru/authorize (state >= 32 chars, PKCE S256
 *   mandatory);
 * - callback: a SINGLE `payload` URL parameter holding JSON
 *   { code, state, type: "code_v2", device_id } — not classic params;
 * - token: POST https://id.vk.ru/oauth2/auth with grant_type=
 *   authorization_code, code, code_verifier, client_id, device_id,
 *   redirect_uri, state — the documented exchange carries NO client_secret;
 * - user info: POST https://id.vk.ru/oauth2/user_info (client_id +
 *   access_token) → user.user_id is the stable identity, user.email rides
 *   only with the `email` scope.
 * Configuration comes from IntegrationRuntimeService (M-INTEGRATIONS-2):
 * DB-authoritative with a documented ENV fallback; the VK flow uses no
 * client secret, so none is ever decrypted for it. Provider tokens are
 * used once and never stored/logged/returned. */
@Injectable()
export class VkOAuthService {
  constructor(private readonly runtime: IntegrationRuntimeService) {}

  private async configuration(): Promise<OAuthProviderConfiguration> {
    return this.runtime.getOAuthConfiguration('vk');
  }

  /** Async since M-INTEGRATIONS-2: the effective configuration is resolved
   * per request (DB-first, no cache) — an admin change applies instantly. */
  async isEnabled(): Promise<boolean> {
    const config = await this.configuration();
    return config.clientId !== '' && config.redirectUri !== '';
  }

  async authorizeUrl(options: {
    state: string;
    codeChallenge: string;
  }): Promise<string> {
    return authorizeUrl(await this.configuration(), options);
  }

  /** Parses the documented `payload` callback parameter. Uniform failure
   * on absence/malformed JSON/wrong type — the caller maps that to the
   * controlled sign-in redirect. */
  parseCallback(
    payload: string | undefined,
  ): { code: string; state: string; deviceId: string | null } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload ?? '');
    } catch {
      throw new UnauthorizedException('Не удалось войти через VK');
    }
    if (typeof parsed !== 'object' || parsed === null) {
      throw new UnauthorizedException('Не удалось войти через VK');
    }
    const { code, state, device_id: deviceId } = parsed as Record<string, unknown>;
    if (typeof code !== 'string' || code === '' || typeof state !== 'string') {
      throw new UnauthorizedException('Не удалось войти через VK');
    }
    return {
      code,
      state,
      deviceId: typeof deviceId === 'string' ? deviceId : null,
    };
  }

  /** Exchanges the authorization code for an access token using the
   * browser-bound PKCE verifier and the device_id from the payload.
   * access_token and refresh_token are both dropped by the caller. */
  async exchangeCode(
    code: string,
    codeVerifier: string,
    deviceId: string | null,
    state: string,
  ): Promise<string> {
    const config = await this.configuration();
    // The VK code_v2 flow carries no client_secret — but a disabled or
    // incomplete configuration must never reach the provider (the
    // controller gates start; this guards the callback path).
    if (config.clientId === '' || config.redirectUri === '') {
      throw new UnauthorizedException('Не удалось войти через VK');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
      state,
    });
    if (deviceId) {
      body.set('device_id', deviceId);
    }
    let response: Response;
    try {
      response = await fetch('https://id.vk.ru/oauth2/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch {
      throw new UnauthorizedException('Не удалось войти через VK');
    }
    if (!response.ok) {
      throw new UnauthorizedException('Не удалось войти через VK');
    }
    const tokens = (await response.json()) as { access_token?: unknown };
    if (typeof tokens.access_token !== 'string' || tokens.access_token === '') {
      throw new UnauthorizedException('Не удалось войти через VK');
    }
    return tokens.access_token;
  }

  /** Resolves the stable VK identity: user.user_id. The email rides only
   * when the token carries the email scope — absence is fine here, the
   * caller decides whether login can proceed without it. */
  async fetchIdentity(accessToken: string): Promise<{
    providerUserId: string;
    email: string | null;
  }> {
    const config = await this.configuration();
    if (config.clientId === '') {
      throw new UnauthorizedException('Не удалось получить данные VK ID');
    }
    let response: Response;
    try {
      response = await fetch('https://id.vk.ru/oauth2/user_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          access_token: accessToken,
        }),
      });
    } catch {
      throw new UnauthorizedException('Не удалось получить данные VK ID');
    }
    if (!response.ok) {
      throw new UnauthorizedException('Не удалось получить данные VK ID');
    }
    const payload = (await response.json()) as {
      user?: { user_id?: unknown; email?: unknown };
    };
    const userId = payload.user?.user_id;
    if (typeof userId !== 'string' && typeof userId !== 'number') {
      throw new UnauthorizedException('Не удалось получить данные VK ID');
    }
    const email =
      typeof payload.user?.email === 'string' && payload.user.email !== ''
        ? payload.user.email
        : null;
    return { providerUserId: String(userId), email };
  }
}
