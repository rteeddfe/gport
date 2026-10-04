"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signIn } from "@/services/auth.service";
import { ME_QUERY_KEY } from "./use-me";

export function useSignIn() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: ({ user }) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  return {
    ...mutation,
    signIn: mutation.mutate,
  };
}
