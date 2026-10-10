import {
  apiFetch,
} from "@/lib/api/client";
import type {
  IntegrationUpdateInput,
  IntegrationView,
} from "@/types/api";

/** Admin integrations (M-INTEGRATIONS-1) — sanitized views only; the API
 * never returns secret values (see GET contract in types/api). */
export async function adminGetIntegrations(): Promise<IntegrationView[]> {
  return apiFetch<IntegrationView[]>("/admin/integrations");
}

export async function adminUpdateIntegration(
  provider: string,
  input: IntegrationUpdateInput,
): Promise<IntegrationView> {
  return apiFetch<IntegrationView>(`/admin/integrations/${provider.toLowerCase()}`, {
    method: "PUT",
    body: input,
  });
}

export async function adminRemoveIntegrationSecret(
  provider: string,
  name: string,
): Promise<IntegrationView> {
  return apiFetch<IntegrationView>(
    `/admin/integrations/${provider.toLowerCase()}/secrets/${name}`,
    { method: "DELETE" },
  );
}

export async function adminRemoveIntegration(provider: string): Promise<void> {
  return apiFetch<void>(`/admin/integrations/${provider.toLowerCase()}`, {
    method: "DELETE",
  });
}
