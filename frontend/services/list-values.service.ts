import { apiFetch } from "@/lib/api/client";
import type { ListValue } from "@/types/api";

/** The whole registry is a handful of rows — the product form and the
 * storefront display names read it whole. */
export function getListValues(kind?: string): Promise<ListValue[]> {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  return apiFetch<ListValue[]>(`/list-values${query}`, {
    next: { tags: ["list-values"], revalidate: 300 },
  });
}

export interface AdminListValueInput {
  kind: string;
  name: string;
  slug?: string;
}

export function adminCreateListValue(input: AdminListValueInput): Promise<ListValue> {
  return apiFetch<ListValue, AdminListValueInput>("/admin/list-values", {
    method: "POST",
    body: input,
  });
}

export function adminUpdateListValue(
  id: string,
  input: Partial<AdminListValueInput>,
): Promise<ListValue> {
  return apiFetch<ListValue, Partial<AdminListValueInput>>(
    `/admin/list-values/${id}`,
    { method: "PATCH", body: input },
  );
}

export function adminDeleteListValue(id: string): Promise<void> {
  return apiFetch<void>(`/admin/list-values/${id}`, { method: "DELETE" });
}
