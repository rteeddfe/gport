import { apiFetch } from "@/lib/api/client";
import type { AuthResponse, AuthUser } from "@/types/api";

export function signIn(body: { email: string; password: string }): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", { method: "POST", body });
}

export function signUp(body: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", { method: "POST", body });
}

export function signOut(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export function me(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}
