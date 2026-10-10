import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { OAuthStateService, oauthPkceCookieName, oauthStateCookieName } from './oauth-state.service.js';
import { parseCookie } from '../../common/utils/cookies.js';

const OPTIONS = { secure: false, sameSite: 'Lax' } as const;

/** Join the issued cookies into a request Cookie header (name=value only). */
function asRequestCookie(setCookies: string[]): string {
  return setCookies
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

describe('OAuthStateService (M-OAUTH-1)', () => {
  const service = new OAuthStateService();

  it('issues CSPRNG state + verifier with an S256 challenge and httpOnly cookies', () => {
    const first = service.issue('YANDEX', OPTIONS);
    const second = service.issue('YANDEX', OPTIONS);

    // Unpredictable per start, provider-scoped cookie names.
    expect(first.state).not.toBe(second.state);
    expect(first.state).toMatch(/^[A-Za-z0-9_-]{40,50}$/);
    expect(first.setCookies).toHaveLength(2);
    expect(first.setCookies[0]).toContain('oauth_state_yandex=');
    expect(first.setCookies[1]).toContain('oauth_pkce_yandex=');
    expect(first.setCookies[0]).toContain('HttpOnly');
    expect(first.setCookies[0]).toContain(`Max-Age=${10 * 60}`);

    // S256: challenge = base64url(SHA-256(verifier)); the verifier itself
    // rides only in its own httpOnly cookie, never in the URL data.
    const verifier = parseCookie(
      first.setCookies.join('; '),
      oauthPkceCookieName('YANDEX'),
    );
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{80,95}$/);
    expect(first.codeChallenge).toBe(
      createHash('sha256').update(verifier).digest('base64url'),
    );
    // Two starts never share a state (replay protection basis).
    expect(second.state).not.toBe(first.state);
  });

  it('consume returns the stored verifier when the provider echoes the state', () => {
    const { state, setCookies } = service.issue('VK', OPTIONS);
    const cookieHeader = asRequestCookie(setCookies);
    expect(service.consume('VK', { headers: { cookie: cookieHeader } }, state)).toBe(
      parseCookie(cookieHeader, oauthPkceCookieName('VK')),
    );
  });

  it('consume rejects a mismatched, absent or repeated state uniformly', () => {
    const { state, setCookies } = service.issue('VK', OPTIONS);
    const cookieHeader = asRequestCookie(setCookies);

    expect(() =>
      service.consume('VK', { headers: { cookie: cookieHeader } }, 'wrong-state'),
    ).toThrow(UnauthorizedException);
    expect(() =>
      service.consume('VK', { headers: { cookie: cookieHeader } }, undefined),
    ).toThrow(UnauthorizedException);
    // Provider mix-up: the VK state is not valid for the Yandex route.
    expect(() =>
      service.consume('YANDEX', { headers: { cookie: cookieHeader } }, state),
    ).toThrow(UnauthorizedException);
  });

  it('clearCookies expires both cookies so a replayed callback finds nothing', () => {
    const cleared = service.clearCookies('YANDEX', OPTIONS);
    const headerAfterClear = cleared.join('; ');

    expect(parseCookie(headerAfterClear, oauthStateCookieName('YANDEX'))).toBe('');
    expect(parseCookie(headerAfterClear, oauthPkceCookieName('YANDEX'))).toBe('');
  });
});
