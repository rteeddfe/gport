/**
 * Domain types mirroring backend DTOs (manually typed for now; the plan is to
 * generate them from the Swagger/OpenAPI schema — see docs/api.md).
 */

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

/** Admin tab permissions granted to ADMIN accounts (SUPER_ADMIN bypasses
 * them). «products» covers both the products and the categories tabs. */
export type AdminPermission = "products" | "posts" | "reviews" | "promo-codes";

export const ADMIN_PERMISSIONS: AdminPermission[] = [
  "products",
  "posts",
  "reviews",
  "promo-codes",
];

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
  instruction: string | null;
  region: string | null;
  platform: string | null;
  genre: string[];
  localization: string | null;
  ageRating: string | null;
  images: string[];
  priceCents: number;
  oldPriceCents: number | null;
  /** Available quantity (digital keys) in stock. */
  stock: number;
  currency: string;
  status: ProductStatus;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

/** GET /products/:slug — the product plus up to 8 related PUBLISHED
 * products from the same category. */
export interface ProductDetail extends Product {
  related: Product[];
}

export type PostStatus = "DRAFT" | "PUBLISHED";

export type ReviewStatus = "PENDING" | "PUBLISHED" | "REJECTED";

/** Blog/news post (GET /posts, GET /posts/:slug). The public endpoints see
 * PUBLISHED only; publishedAt is stamped by the backend on first publish. */
export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Storefront review. Public endpoints see PUBLISHED only; submissions
 * land in PENDING for admin moderation. ip is admin-only context. */
export interface Review {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  ip: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DiscountType = "PERCENT" | "FIXED";

/** Admin promo code (GET /admin/promo-codes) — full row with usage
 * counters. PERCENT value is 1..99; FIXED value is kopecks. Codes are
 * distributed off-site, so there is no public enumeration endpoint —
 * the storefront only accepts a code in the cart. */
export interface PromoCode {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  minSubtotalCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  permissions: AdminPermission[];
}

/** Tokens ride as httpOnly cookies — the body only carries the profile. */
export interface AuthResponse {
  user: AuthUser;
}

/** User row as the SUPER_ADMIN user management returns it (GET
 * /admin/users, PATCH /admin/users/:id) — no password hash. */
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
}

/** Active session of a user (a stored refresh token). */
export interface AdminUserSession {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export interface AdminUserDetail extends AdminUser {
  sessions: AdminUserSession[];
}

export interface HealthStatus {
  status: "ok";
  database: "up" | "down";
  timestamp: string;
}

export interface SearchSuggestion {
  products: {
    id: string;
    slug: string;
    title: string;
    priceCents: number;
    oldPriceCents: number | null;
    images: string[];
  }[];
  categories: {
    id: string;
    slug: string;
    name: string;
  }[];
}

export interface SocialLink {
  label: string;
  url: string;
  iconUrl?: string;
}

/** Singleton row from GET /settings — everything is public; only writes
 * are admin-gated. */
export interface SiteSettings {
  id: number;
  siteName: string;
  supportEmail: string;
  logoUrl: string;
  socials: SocialLink[];
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string | null;
  faviconUrl: string;
  robotsTxt: string;
  manifestName: string;
  manifestShortName: string;
  manifestThemeColor: string;
  manifestBackgroundColor: string;
  manifestIcon192Url: string;
  manifestIcon512Url: string;
  /** Yandex Metrika counter number; empty = counter disabled. */
  metrikaCounterId: string;
  metrikaWebvisor: boolean;
  /** Yandex Webmaster verification — meta tag or bare content value. */
  yandexVerification: string;
  updatedAt: string;
}

/** Singleton hero-banner content of the homepage (GET /home-content). */
export interface HomeContent {
  id: number;
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  tiles: string[];
  updatedAt: string;
}

export interface PolicyPageSummary {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  updatedAt: string;
}

export interface PolicyPage extends PolicyPageSummary {
  content: string;
  createdAt: string;
}

export type FaqCategory = "topup" | "games";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

export interface UploadedFileInfo {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}
