import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { OAuthProviderConfiguration } from '../../config/configuration.js';
import { IntegrationRuntimeService } from '../../integrations/integration-runtime.service.js';
import { authorizeUrl } from './oauth-providers.js';

/** Yandex ID adapter (M-OAUTH-2). Endpoints and field names per the
 * official docs: POST https://oauth.yandex.ru/token (grant_type=
 * authorization_code, code_verifier), GET https://login.yandex.ru/info
 * (Authorization: OAuth <token>; stable id = `id`, email = `default_email`).
 * Configuration comes from IntegrationRuntimeService (M-INTEGRATIONS-2):
 * DB-authoritative with a documented ENV fallback. Provider tokens are
 * used once here and never stored/logged/returned. */
@Injectable()
export class YandexOAuthService {
  constructor(private readonly runtime: IntegrationRuntimeService) {}

  private async configuration(): Promise<OAuthProviderConfiguration> {
    return this.runtime.getOAuthConfiguration('yandex');
  }

  /** Async since M-INTEGRATIONS-2: the effective configuration is resolved
   * per request (DB-first, no cache) — an admin change applies instantly. */
  async isEnabled(): Promise<boolean> {
    const config = await this.configuration();
    return config.clientId !== '' && config.clientSecret !== '' && config.redirectUri !== '';
  }

  async authorizeUrl(options: {
    state: string;
    codeChallenge: string;
  }): Promise<string> {
    return authorizeUrl(await this.configuration(), options);
  }

  /** Exchanges the authorization code for an access token using the
   * browser-bound PKCE verifier. Returns ONLY the access token — the
   * response's refresh_token (Yandex issues one) is dropped. */
  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const config = await this.configuration();
    // Defense in depth: the controller gates disabled providers already —
    // this guard guarantees no provider request with empty credentials
    // even if the config changes between start and callback.
    if (
      config.clientId === '' ||
      config.clientSecret === '' ||
      config.redirectUri === ''
    ) {
      throw new UnauthorizedException('Не удалось войти через Яндекс');
    }
    let response: Response;
    try {
      response = await fetch('https://oauth.yandex.ru/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          code_verifier: codeVerifier,
        }),
      });
    } catch {
      throw new UnauthorizedException('Не удалось войти через Яндекс');
    }
    if (!response.ok) {
      throw new UnauthorizedException('Не удалось войти через Яндекс');
    }
    const tokens = (await response.json()) as {
      access_token?: unknown;
      error?: unknown;
    };
    if (typeof tokens.access_token !== 'string' || tokens.access_token === '') {
      throw new UnauthorizedException('Не удалось войти через Яндекс');
    }
    return tokens.access_token;
  }

  /** Resolves the stable Yandex identity. `id` is the documented unique
   * user identifier; `default_email` may be absent — the caller decides
   * whether login can proceed without it. */
  async fetchIdentity(accessToken: string): Promise<{
    providerUserId: string;
    email: string | null;
  }> {
    let response: Response;
    try {
      response = await fetch('https://login.yandex.ru/info', {
        headers: { Authorization: `OAuth ${accessToken}` },
      });
    } catch {
      throw new UnauthorizedException('Не удалось получить данные Яндекс ID');
    }
    if (!response.ok) {
      throw new UnauthorizedException('Не удалось получить данные Яндекс ID');
    }
    const info = (await response.json()) as {
      id?: unknown;
      default_email?: unknown;
    };
    if (typeof info.id !== 'string' || info.id === '') {
      throw new UnauthorizedException('Не удалось получить данные Яндекс ID');
    }
    const email =
      typeof info.default_email === 'string' && info.default_email !== ''
        ? info.default_email
        : null;
    return { providerUserId: info.id, email };
  }
}
