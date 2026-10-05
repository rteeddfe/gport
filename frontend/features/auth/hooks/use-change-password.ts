"use client";

import { useMutation } from "@tanstack/react-query";

import { changePassword } from "@/services/auth.service";

/** Password change: the backend revokes every other session, the current
 * one stays alive. The profile cache needs no update. */
export function useChangePassword() {
  const mutation = useMutation({ mutationFn: changePassword });

  return {
    ...mutation,
    changePassword: mutation.mutate,
  };
}
