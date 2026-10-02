import { apiFetch } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";
import type { Product, ProductStatus } from "@/types/api";

export interface FindProductsParams {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  categoryId?: string;
  search?: string;
}

export async function getProducts(params: FindProductsParams = {}): Promise<Paginated<Product>> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return apiFetch<Paginated<Product>>(`/products${query ? `?${query}` : ""}`);
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}
