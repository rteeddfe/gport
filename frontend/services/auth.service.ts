import { apiFetch } from "@/lib/api/client";
import type { AuthResponse, AuthUser, RegisterResponse } from "@/types/api";

export function signIn(body: { email: string; password: string }): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", { method: "POST", body });
}

export function signUp(body: {
  email: string;
  password: string;
  name?: string;
}): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/auth/register", { method: "POST", body });
}

/** Second step of claiming a guest-checkout account: the code that was
 * mailed to the address. On success the session cookies are set. */
export function verifyRegister(body: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register/verify", { method: "POST", body });
}

/** Completes OAuth linking (M-OAUTH-4): the mailed code + the opaque
 * challenge id from the backend redirect. On success the session cookies
 * are set. */
export function verifyOAuthLink(body: {
  challengeId: string;
  code: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/oauth/link/verify", { method: "POST", body });
}

export function signOut(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

/** Server Components must forward the request's cookies themselves —
 * pass { cookie: (await cookies()).toString() } from next/headers. */
export function me(headers?: Record<string, string>): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me", { headers });
}

/** Self-service profile edit; returns the fresh profile. */
export function updateProfile(body: {
  name?: string;
  avatarUrl?: string;
}): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me", { method: "PATCH", body });
}

/** Verifies the current password and replaces it; other sessions die. */
export function changePassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  return apiFetch<void>("/auth/password", { method: "POST", body });
}
