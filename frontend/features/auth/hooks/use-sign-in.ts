"use client";

import { useMutation } from "@tanstack/react-query";
import { signIn } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";

export function useSignIn() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: ({ accessToken, user }) => setAuth(accessToken, user),
  });

  return {
    ...mutation,
    signIn: mutation.mutate,
  };
}
