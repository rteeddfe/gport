/**
 * Minimal cookie helpers so the guest-cart cookie works without adding
 * cookie-parser. Values we store (uuid tokens) are URL-safe anyway.
 */

/** SameSite policy for every cookie. "Lax" (default) fits same-site
 * deployments (site and API share a host, e.g. localhost ports). When the
 * site and the API live on different hosts, the browser drops Lax cookies
 * on cross-site fetches — such deployments must set "None", which the
 * browser only accepts together with Secure. */
export type CookieSameSite = 'Lax' | 'None' | 'Strict';

const COOKIE_BASE_ATTRIBUTES = 'Path=/; HttpOnly';

function sameSiteAttributes(sameSite: CookieSameSite): string {
  return sameSite === 'None' ? 'SameSite=None; Secure' : `SameSite=${sameSite}`;
}

export function parseCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) {
    return undefined;
  }
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

export function serializeSessionCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
  { secure = false, sameSite = 'Lax' }: { secure?: boolean; sameSite?: CookieSameSite } = {},
): string {
  const secureAttribute = secure ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; ${COOKIE_BASE_ATTRIBUTES}; ${sameSiteAttributes(sameSite)}; Max-Age=${maxAgeSeconds}${secureAttribute}`;
}

export function serializeExpiredCookie(
  name: string,
  sameSite: CookieSameSite = 'Lax',
): string {
  return `${name}=; ${COOKIE_BASE_ATTRIBUTES}; ${sameSiteAttributes(sameSite)}; Max-Age=0`;
}
