"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signUp } from "@/services/auth.service";
import { ME_QUERY_KEY } from "./use-me";

export function useSignUp() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: signUp,
    onSuccess: ({ user }) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  return {
    ...mutation,
    signUp: mutation.mutate,
  };
}
