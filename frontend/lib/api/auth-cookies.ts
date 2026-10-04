/** Mirror of backend `src/common/constants/auth-cookies.ts` — keep the
 * names in sync (the frontend only needs to READ presence, never values:
 * the cookies are httpOnly and are set/cleared by the backend). */

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
