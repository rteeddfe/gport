/**
 * Domain types mirroring backend DTOs (manually typed for now; the plan is to
 * generate them from the Swagger/OpenAPI schema — see docs/api.md).
 */

export type Role = "USER" | "ADMIN";

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productsCount: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  priceCents: number;
  currency: string;
  status: ProductStatus;
  categoryId: string;
  category?: Category;
  sellerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface HealthStatus {
  status: "ok";
  database: "up" | "down";
  timestamp: string;
}
