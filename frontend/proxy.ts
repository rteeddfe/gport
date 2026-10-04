import { NextResponse, type NextRequest } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/lib/api/auth-cookies";

/**
 * Route protection per the Next.js docs pattern: the presence of the
 * long-lived session cookie decides access to authenticated areas. The
 * cookie's actual validity is enforced by the API (JWT guard + refresh
 * rotation) — client components additionally gate on /auth/me.
 */
export default function proxy(request: NextRequest) {
  if (!request.cookies.has(REFRESH_TOKEN_COOKIE)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
