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

/** Server Components must forward the request's cookies themselves —
 * pass { cookie: (await cookies()).toString() } from next/headers. */
export function me(headers?: Record<string, string>): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me", { headers });
}
