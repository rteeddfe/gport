import { apiFetch } from "@/lib/api/client";
import type { PolicyPage, PolicyPageSummary } from "@/types/api";

export interface PolicyInput {
  slug: string;
  title: string;
  /** Sanitized rich-text HTML (the backend strips everything off-whitelist). */
  content: string;
  sortOrder?: number;
}

export function getPolicies(): Promise<PolicyPageSummary[]> {
  return apiFetch<PolicyPageSummary[]>("/policies");
}

export function getPolicy(slug: string): Promise<PolicyPage> {
  return apiFetch<PolicyPage>(`/policies/${slug}`);
}

export function createPolicy(input: PolicyInput): Promise<PolicyPage> {
  return apiFetch<PolicyPage, PolicyInput>("/admin/policies", {
    method: "POST",
    body: input,
  });
}

export function updatePolicy(
  id: string,
  input: Partial<PolicyInput>,
): Promise<PolicyPage> {
  return apiFetch<PolicyPage, Partial<PolicyInput>>(`/admin/policies/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deletePolicy(id: string): Promise<void> {
  return apiFetch<void>(`/admin/policies/${id}`, { method: "DELETE" });
}
