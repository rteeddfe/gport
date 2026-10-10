"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyRegister } from "@/services/auth.service";
import { ME_QUERY_KEY } from "./use-me";

/** Completes a passwordless-account claim after the mailed code: on
 * success the session cookies are set and the profile is fresh. */
export function useVerifyRegister() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: verifyRegister,
    onSuccess: ({ user }) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  return {
    ...mutation,
    verifyRegister: mutation.mutate,
  };
}
