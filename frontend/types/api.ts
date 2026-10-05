/**
 * Domain types mirroring backend DTOs (manually typed for now; the plan is to
 * generate them from the Swagger/OpenAPI schema — see docs/api.md).
 */

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

/** Admin tab permissions granted to ADMIN accounts (SUPER_ADMIN bypasses
 * them). «products» covers both the products and the categories tabs. */
export type AdminPermission =
  | "products"
  | "orders"
  | "files"
  | "posts"
  | "reviews"
  | "promo-codes"
  | "support";

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

/** What the buyer gets: a key/gift code, fixed nominals or an amount
 * range for a wallet top-up (drives the checkout form). */
export type ProductKind = "GAME_KEY" | "TOPUP_NOMINAL" | "TOPUP_AMOUNT";

/** Fulfillment: auto code from the key pool or manual operator crediting. */
export type CreditingMode = "AUTO_CODE" | "MANUAL";

/** The account field a top-up buyer fills (Steam login, player ID…). */
export type AccountFieldKind = "LOGIN" | "ID" | "EMAIL";

/** One purchasable nominal of a TOPUP_NOMINAL product («60 UC»). */
export interface ProductVariant {
  id: string;
  productId: string;
  label: string;
  value: number | null;
  unit: string | null;
  priceCents: number;
  oldPriceCents: number | null;
  sortOrder: number;
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
  kind: ProductKind;
  /** TOPUP_AMOUNT only: the buyer-entered amount range (kopecks). */
  minValue: number | null;
  maxValue: number | null;
  /** Service commission on top of the credited amount, percent 0..50. */
  commissionPercent: number;
  creditingMode: CreditingMode;
  /** Checkout account field for top-ups (what the buyer must provide). */
  accountFieldKind: AccountFieldKind | null;
  accountFieldLabel: string | null;
  accountFieldHint: string | null;
  externalId: string | null;
  variants: ProductVariant[];
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

/** GET /products/:slug — the product plus up to 8 related PUBLISHED
 * products from the same category and its buyer FAQ. */
export interface ProductDetail extends Product {
  related: Product[];
  faq: ProductFaqItem[];
}

/** One Q/A pair of a product's FAQ (public view). */
export interface ProductFaqItem {
  question: string;
  answer: string;
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

export type OrderStatus = "AWAITING_PAYMENT" | "PAID" | "CANCELLED";

/** One line of a direct-purchase order (price/title snapshots at buy
 * time). keys = auto-delivered digital keys; instruction = the fallback
 * delivery text; variantLabel/amountCents/accountIdentifier = top-up
 * snapshots (chosen nominal / entered amount / account to credit). */
export interface OrderItemView {
  id: string;
  productTitle: string;
  productSlug: string;
  productImage: string | null;
  instruction: string | null;
  unitPriceCents: number;
  quantity: number;
  variantLabel: string | null;
  amountCents: number | null;
  /** Service commission snapshot charged on top of amountCents. */
  commissionCents: number | null;
  accountIdentifier: string | null;
  keys: string[];
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  provider: string;
  createdAt: string;
  paidAt: string | null;
  items: OrderItemView[];
}

export interface AdminOrderView extends OrderView {
  userName: string | null;
  userEmail: string;
}

export interface PaginatedOrders {
  items: AdminOrderView[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Enabled payment method for the buy dialog. */
export interface PaymentMethod {
  id: string;
  name: string;
}

/** Credential field of an acquirer (drives the admin settings form). */
export interface PaymentProviderField {
  key: string;
  label: string;
  secret?: boolean;
}

export interface PaymentProviderMeta {
  id: string;
  name: string;
  fields: PaymentProviderField[];
  /** Only the test emulator is integrated end-to-end for now. */
  live: boolean;
}

export interface ProviderConfigView {
  enabled: boolean;
  config: Record<string, string>;
}

export interface PaymentSettingsView {
  testEnabled: boolean;
  providers: Record<string, ProviderConfigView>;
  providerMeta: PaymentProviderMeta[];
  updatedAt: string;
}

export interface PaymentSettingsInput {
  testEnabled: boolean;
  providers: Record<string, { enabled: boolean; config: Record<string, string> }>;
}

/** Data of the emulated acquiring page (/pay/test/:token). */
export interface TestSessionView {
  orderId: string;
  status: OrderStatus;
  amountCents: number;
  currency: string;
  description: string;
}

/** Outbox letter (no SMTP yet — rows are the delivery). */
export interface EmailLogView {
  id: string;
  orderId: string | null;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
}

/** Auto-delivery keys of a product (admin). */
export interface ProductKeysView {
  keys: { id: string; value: string; isSold: boolean }[];
  available: number;
  sold: number;
}

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
  /** App path or uploaded /files/:id URL; null = show the initials chip. */
  avatarUrl: string | null;
  role: Role;
  permissions: AdminPermission[];
}

/** Admin-managed card of the home top-up wall (image + link). */
export interface HomeWallCard {
  imageUrl: string;
  href: string;
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
  /** Cards of the home top-up wall; empty = built-in service tiles. */
  wallCards: HomeWallCard[];
  /** Cards of the hero cylinder carousel (image + link); empty = the
   * built-in placeholder covers. */
  carouselCards: HomeWallCard[];
  /** Services of the home top-up FORM, resolved against PUBLISHED
   * products; empty = the form block hides. */
  topupServices: HomeServiceCard[];
  /** Services of the home service WALL (block 3); empty = built-in
   * service tiles. */
  serviceCards: HomeServiceCard[];
  updatedAt: string;
}

/** A service top-up product picked for a home block. */
export interface HomeServiceCard {
  productId: string;
  /** Admin-uploaded mini logo; null = use the product cover. */
  iconUrl: string | null;
  slug: string;
  title: string;
  /** TOPUP_AMOUNT lower bound or the base price (kopecks) — «от N ₽». */
  priceFromCents: number;
  commissionPercent: number;
  image: string | null;
  /** Checkout account field of the product (form rendering). */
  accountFieldKind: "LOGIN" | "ID" | "EMAIL" | null;
  accountFieldLabel: string | null;
  accountFieldHint: string | null;
  /** TOPUP_AMOUNT upper bound (kopecks); null otherwise. */
  maxValue: number | null;
}

/** A support ticket from the storefront bubble (public view: own row). */
export type SupportTicketStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

export interface SupportTicketView {
  id: string;
  name: string | null;
  contact: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
}

export interface AdminSupportTicketView extends SupportTicketView {
  ip: string | null;
}

export interface PaginatedTickets {
  items: AdminSupportTicketView[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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
