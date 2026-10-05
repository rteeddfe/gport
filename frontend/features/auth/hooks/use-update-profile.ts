"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ME_QUERY_KEY } from "./use-me";
import { updateProfile } from "@/services/auth.service";
import type { AuthUser } from "@/types/api";

/** Saves the profile form and refreshes the cached session profile. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (user: AuthUser) => queryClient.setQueryData(ME_QUERY_KEY, user),
  });

  return {
    ...mutation,
    updateProfile: mutation.mutate,
  };
}
