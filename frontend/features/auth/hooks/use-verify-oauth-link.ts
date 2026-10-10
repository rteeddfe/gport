"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyOAuthLink } from "@/services/auth.service";
import { ME_QUERY_KEY } from "./use-me";

/** Completes OAuth linking (M-OAUTH-4): the backend sets the session
 * cookies and returns the profile, which refreshes the existing auth
 * state — no OAuth-specific session exists. */
export function useVerifyOAuthLink() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: verifyOAuthLink,
    onSuccess: ({ user }) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  return {
    ...mutation,
    verifyOAuthLink: mutation.mutate,
  };
}
