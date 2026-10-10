import { apiFetch } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type { Paginated } from "@/lib/api/types";
import type {
  AccountFieldKind,
  CreditingMode,
  Product,
  ProductDetail,
  ProductFaqItem,
  ProductKeysView,
  ProductKind,
  ProductStatus,
} from "@/types/api";

export interface FindProductsParams {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  platform?: string;
  genre?: string;
  /** «Только со скидкой» — sent as sale=1. */
  sale?: boolean | "1" | "true";
  priceMin?: number;
  priceMax?: number;
  /** Backend ProductSort: `popular` | `new` | `price_asc` | `price_desc` | `discount`. */
  sort?: "popular" | "new" | "price_asc" | "price_desc" | "discount";
}

export function getProducts(params: FindProductsParams = {}): Promise<Paginated<Product>> {
  return apiFetch<Paginated<Product>>(`/products${buildQuery({ ...params })}`, {
    // Server-rendered catalog: cached under the tag and revalidated by
    // admin product mutations (revalidateStorefrontTags); 300 s keeps a
    // missed invalidation from going stale forever.
    next: { tags: ["products"], revalidate: 300 },
  });
}

/** Public product card is slug-addressed (GET /products/:slug). */
export function getProductDetail(slug: string): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/products/${slug}`, {
    next: { tags: ["products"], revalidate: 300 },
  });
}

/** One nominal of a TOPUP_NOMINAL product (admin upsert input). */
export interface ProductVariantInput {
  label: string;
  value?: number | null;
  unit?: string | null;
  priceCents: number;
  oldPriceCents?: number | null;
}

export interface AdminProductInput {
  title: string;
  slug?: string;
  description?: string;
  instruction?: string;
  /** Catalog platform facet: steam | playstation | xbox | nintendo. */
  platform?: string;
  genre?: string[];
  images?: string[];
  priceCents: number;
  oldPriceCents?: number | null;
  cashbackPercent?: number;
  releaseYear?: number | null;
  rating?: number | null;
  consoles?: string[];
  tags?: string[];
  /** Subscription service one-liner. */
  tagline?: string | null;
  /** Subscription group: gaming | ai | media | social. */
  group?: string | null;
  features?: string[];
  searchAliases?: string[];
  systemRequirements?: Record<string, unknown> | null;
  stock: number;
  status?: ProductStatus;
  kind?: ProductKind;
  /** TOPUP_AMOUNT only: the buyer-entered amount range (kopecks). */
  minValue?: number | null;
  maxValue?: number | null;
  creditingMode?: CreditingMode;
  accountFieldKind?: AccountFieldKind | null;
  accountFieldLabel?: string | null;
  accountFieldHint?: string | null;
  /** TOPUP_NOMINAL only: full replace of the nominal list. */
  variants?: ProductVariantInput[];
  categoryId: string;
}

export function adminGetProducts(params: FindProductsParams = {}): Promise<Paginated<Product>> {
  return apiFetch<Paginated<Product>>(`/admin/products${buildQuery({ ...params })}`);
}

/** Admin single product — findOne returns the FAQ list alongside
 * (the public detail adds `related` instead). */
export type AdminProduct = Product & { faq: ProductFaqItem[] };

export function adminGetProduct(id: string): Promise<AdminProduct> {
  return apiFetch<AdminProduct>(`/admin/products/${id}`);
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

/** Auto-delivery keys of a product (available + sold with their values). */
export function adminGetProductKeys(
  id: string,
): Promise<ProductKeysView> {
  return apiFetch<ProductKeysView>(`/admin/products/${id}/keys`);
}

/** Replaces the unsold keys with the pasted list (sold ones stay). */
export function adminReplaceProductKeys(
  id: string,
  keys: string[],
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }, { keys: string[] }>(
    `/admin/products/${id}/keys`,
    { method: "PUT", body: { keys } },
  );
}

/** Replaces the whole FAQ list (display order = list order). */
export function adminReplaceProductFaq(
  id: string,
  faq: ProductFaqItem[],
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }, { faq: ProductFaqItem[] }>(
    `/admin/products/${id}/faq`,
    { method: "PUT", body: { faq } },
  );
}
