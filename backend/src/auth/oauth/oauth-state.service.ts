import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { OAuthProvider } from '../../generated/prisma/client.js';
import {
  parseCookie,
  serializeExpiredCookie,
  serializeSessionCookie,
  type CookieSameSite,
} from '../../common/utils/cookies.js';

/** One browser visit of the authorize page = one state + one PKCE pair.
 * They live ONLY in short-lived httpOnly cookies: that binds them to the
 * browser (login-CSRF protection), keeps them single-use (cleared on the
 * first valid callback) and avoids any server-side storage. */
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const STATE_BYTES = 32;
/** base64url of 64 bytes ≈ 86 chars — inside RFC 7636's 43..128 range. */
const VERIFIER_BYTES = 64;

export function oauthStateCookieName(provider: OAuthProvider): string {
  return `oauth_state_${provider.toLowerCase()}`;
}

export function oauthPkceCookieName(provider: OAuthProvider): string {
  return `oauth_pkce_${provider.toLowerCase()}`;
}

export interface CookieOptions {
  secure: boolean;
  sameSite: CookieSameSite;
}

export interface OAuthStartSession {
  state: string;
  /** S256 challenge: base64url(SHA-256(verifier)). */
  codeChallenge: string;
  setCookies: string[];
}

function equalSafe(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class OAuthStateService {
  issue(provider: OAuthProvider, options: CookieOptions): OAuthStartSession {
    const state = randomBytes(STATE_BYTES).toString('base64url');
    const verifier = randomBytes(VERIFIER_BYTES).toString('base64url');
    const codeChallenge = createHash('sha256').update(verifier).digest('base64url');
    return {
      state,
      codeChallenge,
      setCookies: [
        serializeSessionCookie(
          oauthStateCookieName(provider),
          state,
          OAUTH_STATE_TTL_SECONDS,
          options,
        ),
        serializeSessionCookie(
          oauthPkceCookieName(provider),
          verifier,
          OAUTH_STATE_TTL_SECONDS,
          options,
        ),
      ],
    };
  }

  /** Validates the state the provider echoed back against the
   * browser-bound cookie and returns the PKCE verifier for the token
   * exchange. Uniform failure for missing/mismatched/expired state. */
  consume(
    provider: OAuthProvider,
    request: Pick<Request, 'headers'>,
    returnedState: string | undefined,
  ): string {
    const expectedState = parseCookie(
      request.headers?.cookie,
      oauthStateCookieName(provider),
    );
    if (
      !returnedState ||
      !expectedState ||
      !equalSafe(expectedState, returnedState)
    ) {
      throw new UnauthorizedException('OAuth-сессия истекла. Повторите вход.');
    }
    const verifier = parseCookie(
      request.headers.cookie,
      oauthPkceCookieName(provider),
    );
    if (!verifier) {
      throw new UnauthorizedException('OAuth-сессия истекла. Повторите вход.');
    }
    return verifier;
  }

  /** Clears both cookies — the callback must call this on EVERY outcome
   * (success or failure) so a replayed callback never finds them. */
  clearCookies(provider: OAuthProvider, options: CookieOptions): string[] {
    return [
      serializeExpiredCookie(oauthStateCookieName(provider), options.sameSite),
      serializeExpiredCookie(oauthPkceCookieName(provider), options.sameSite),
    ];
  }
}
