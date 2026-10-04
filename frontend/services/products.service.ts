import { apiFetch } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type { Paginated } from "@/lib/api/types";
import type { Product, ProductDetail, ProductStatus } from "@/types/api";

export interface FindProductsParams {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  region?: string;
  platform?: string;
  genre?: string;
  priceMin?: number;
  priceMax?: number;
  /** Backend ProductSort: `new` | `price_asc` | `price_desc`. */
  sort?: "new" | "price_asc" | "price_desc";
}

export function getProducts(params: FindProductsParams = {}): Promise<Paginated<Product>> {
  return apiFetch<Paginated<Product>>(`/products${buildQuery({ ...params })}`);
}

/** Public product card is slug-addressed (GET /products/:slug). */
export function getProductDetail(slug: string): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/products/${slug}`);
}

export interface AdminProductInput {
  title: string;
  slug?: string;
  description?: string;
  instruction?: string;
  region?: string;
  platform?: string;
  genre?: string[];
  localization?: string;
  ageRating?: string;
  images?: string[];
  priceCents: number;
  oldPriceCents?: number | null;
  stock: number;
  status?: ProductStatus;
  categoryId: string;
}

export function adminGetProducts(params: FindProductsParams = {}): Promise<Paginated<Product>> {
  return apiFetch<Paginated<Product>>(`/admin/products${buildQuery({ ...params })}`);
}

export function adminGetProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/admin/products/${id}`);
}

export function adminCreateProduct(input: AdminProductInput): Promise<Product> {
  return apiFetch<Product, AdminProductInput>("/admin/products", {
    method: "POST",
    body: input,
  });
}

export function adminUpdateProduct(id: string, input: AdminProductInput): Promise<Product> {
  return apiFetch<Product, AdminProductInput>(`/admin/products/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function adminDeleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/admin/products/${id}`, { method: "DELETE" });
}
