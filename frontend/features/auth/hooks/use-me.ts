"use client";

import { useQuery } from "@tanstack/react-query";
import { me } from "@/services/auth.service";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * Session source of truth: /auth/me validates the httpOnly cookie jar and
 * returns the profile. Login/register/refresh seed the cache directly;
 * sign-out removes it. Nothing session-related lives in client storage.
 *
 * `enabled: false` (no session cookie per the server-rendered hint) skips
 * the request entirely — the header renders «Войти» in the SSR markup
 * instead of popping it in after the check.
 */
export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => me(),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: options?.enabled ?? true,
  });
}
