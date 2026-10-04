import { apiFetch } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type { Paginated } from "@/lib/api/types";
import type {
  AdminPermission,
  AdminUser,
  AdminUserDetail,
  Role,
} from "@/types/api";

export interface FindUsersParams {
  page?: number;
  limit?: number;
}

/** SUPER_ADMIN user management (GET /admin/users). */
export function adminGetUsers(
  params: FindUsersParams = {},
): Promise<Paginated<AdminUser>> {
  return apiFetch<Paginated<AdminUser>>(`/admin/users${buildQuery({ ...params })}`);
}

export function adminGetUser(id: string): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/admin/users/${id}`);
}

export interface AdminUserAccessInput {
  /** Only USER|ADMIN — the API never grants SUPER_ADMIN. */
  role?: Role;
  /** Replaces the whole permission set; empty array revokes all. */
  permissions?: AdminPermission[];
}

export function adminUpdateUserAccess(
  id: string,
  input: AdminUserAccessInput,
): Promise<AdminUser> {
  return apiFetch<AdminUser, AdminUserAccessInput>(`/admin/users/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function adminDeleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" });
}

/** Signs the user out everywhere: every active refresh token is revoked. */
export function adminRevokeUserSessions(id: string): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}/sessions`, { method: "DELETE" });
}

export function adminRevokeUserSession(
  id: string,
  sessionId: string,
): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
