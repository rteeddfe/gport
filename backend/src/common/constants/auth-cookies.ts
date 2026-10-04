/** Shared by the auth endpoints (Set-Cookie) and the JWT strategy
 * (cookie extractor) so both sides always agree on the names. Mirrored
 * on the frontend in lib/api/auth-cookies.ts. */

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
