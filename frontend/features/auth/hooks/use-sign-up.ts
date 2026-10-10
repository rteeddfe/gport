"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signUp } from "@/services/auth.service";
import { ME_QUERY_KEY } from "./use-me";

export function useSignUp() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: (result) => {
      // A verification-required claim returns no user — the form shows
      // the code step instead of a session.
      if ("user" in result) {
        queryClient.setQueryData(ME_QUERY_KEY, result.user);
      }
    },
  });

  return {
    ...mutation,
    signUp: mutation.mutate,
  };
}
