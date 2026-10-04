"use client";

import { useQuery } from "@tanstack/react-query";
import { me } from "@/services/auth.service";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * Session source of truth: /auth/me validates the httpOnly cookie jar and
 * returns the profile. Login/register/refresh seed the cache directly;
 * sign-out removes it. Nothing session-related lives in client storage.
 */
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => me(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
