import { apiFetch } from "@/lib/api/client";
import type { Category } from "@/types/api";

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories", {
    next: { tags: ["categories"], revalidate: 300 },
  });
}

export interface AdminCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  type?: string;
  badges?: string[];
}

export function adminCreateCategory(input: AdminCategoryInput): Promise<Category> {
  return apiFetch<Category, AdminCategoryInput>("/admin/categories", {
    method: "POST",
    body: input,
  });
}

export function adminUpdateCategory(id: string, input: AdminCategoryInput): Promise<Category> {
  return apiFetch<Category, AdminCategoryInput>(`/admin/categories/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function adminDeleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/admin/categories/${id}`, { method: "DELETE" });
}
