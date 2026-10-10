import type { Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../common/constants/auth-cookies.js';
import {
  serializeSessionCookie,
  type CookieSameSite,
} from '../common/utils/cookies.js';
import type { AuthResult } from './auth.service.js';

export interface SessionCookieOptions {
  secure: boolean;
  sameSite: CookieSameSite;
}

/** Browser-equivalent of the auth endpoints' environment: Secure only in
 * production, SameSite from config. */
export function sessionCookieOptions(
  configService: { get: (key: string) => unknown },
  nodeEnv: string | undefined,
): SessionCookieOptions {
  return {
    secure: nodeEnv === 'production',
    sameSite:
      (configService.get('cookieSameSite') as CookieSameSite | undefined) ??
      'Lax',
  };
}

/** httpOnly SameSite cookies for a fresh session pair. Shared by the
 * password endpoints and the OAuth callback — the flags must never
 * diverge between the two login paths. */
export function setSessionCookies(
  response: Response,
  result: AuthResult,
  options: SessionCookieOptions,
): void {
  response.setHeader('Set-Cookie', [
    serializeSessionCookie(
      ACCESS_TOKEN_COOKIE,
      result.accessToken,
      ACCESS_TOKEN_TTL_SECONDS,
      options,
    ),
    serializeSessionCookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      REFRESH_TOKEN_TTL_SECONDS,
      options,
    ),
  ]);
}
