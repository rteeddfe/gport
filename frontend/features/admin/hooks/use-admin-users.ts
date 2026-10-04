"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminDeleteUser,
  adminGetUser,
  adminGetUsers,
  adminRevokeUserSession,
  adminRevokeUserSessions,
  adminUpdateUserAccess,
  type AdminUserAccessInput,
  type FindUsersParams,
} from "@/services/users.service";

export const ADMIN_USERS_QUERY_KEY = ["admin-users"] as const;

export function useAdminUsers(params: FindUsersParams = {}) {
  return useQuery({
    queryKey: [...ADMIN_USERS_QUERY_KEY, params],
    queryFn: () => adminGetUsers(params),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: [...ADMIN_USERS_QUERY_KEY, id],
    queryFn: () => adminGetUser(id),
  });
}

/** Mutations for the user management pages; every change invalidates both
 * the list and the affected detail view. */
export function useAdminUserMutations() {
  const queryClient = useQueryClient();

  const invalidate = (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    if (id) {
      void queryClient.invalidateQueries({
        queryKey: [...ADMIN_USERS_QUERY_KEY, id],
      });
    }
  };

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUserAccessInput }) =>
      adminUpdateUserAccess(id, input),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: () => invalidate(),
  });
  const revokeSessions = useMutation({
    mutationFn: (id: string) => adminRevokeUserSessions(id),
    onSuccess: (_data, id) => invalidate(id),
  });
  const revokeSession = useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId: string }) =>
      adminRevokeUserSession(id, sessionId),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });

  return { update, remove, revokeSessions, revokeSession };
}
