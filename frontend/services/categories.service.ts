import { apiFetch } from "@/lib/api/client";
import type { Category } from "@/types/api";

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories");
}
