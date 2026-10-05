import { apiFetch } from "@/lib/api/client";
import type { FaqCategory, FaqItem } from "@/types/api";

export interface FaqItemInput {
  question: string;
  answer: string;
  category: FaqCategory;
  sortOrder?: number;
  isActive?: boolean;
}

/** Public read: active items only (the storefront FAQ block). */
export function getFaq(): Promise<FaqItem[]> {
  return apiFetch<FaqItem[]>("/faq", {
    next: { tags: ["faq"], revalidate: 300 },
  });
}

/** Admin read: everything, including hidden items. */
export function getAdminFaq(): Promise<FaqItem[]> {
  return apiFetch<FaqItem[]>("/admin/faq");
}

export function createFaqItem(input: FaqItemInput): Promise<FaqItem> {
  return apiFetch<FaqItem, FaqItemInput>("/admin/faq", {
    method: "POST",
    body: input,
  });
}

export function updateFaqItem(
  id: string,
  input: Partial<FaqItemInput>,
): Promise<FaqItem> {
  return apiFetch<FaqItem, Partial<FaqItemInput>>(`/admin/faq/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteFaqItem(id: string): Promise<void> {
  return apiFetch<void>(`/admin/faq/${id}`, { method: "DELETE" });
}
