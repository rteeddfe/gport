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
  | "support"
  | "integrations";

/** Admin integrations view (M-INTEGRATIONS-1/-2): secrets are collapsed to
 * presence flags — the API never returns a secret value. `config` always
 * carries every registry field (empty string = not set), including the
 * backend-validated OAuth redirect URI. */
export interface IntegrationView {
  provider: string;
  type: string;
  title: string;
  description: string;
  enabled: boolean;
  config: Record<string, string>;
  configured: boolean;
  secretsConfigured: Record<string, boolean>;
  updatedAt: string | null;
}

export interface IntegrationUpdateInput {
  enabled?: boolean;
  config?: Record<string, string>;
  secrets?: Record<string, string>;
}

/** Audit log row (M-AUDIT-1): server-side sanitized metadata only —
 * no secrets/tokens/passwords ever reach this shape. */
export interface AuditLogView {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogView[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Fixed storefront section: games | subscriptions | currency. */
  type: string;
  productsCount: number;
}

/** One value of a fixed list kind (the «Списки» registry). */
export interface ListValue {
  id: string;
  /** tags | platform | genre | consoles | subscription-group | subscription-includes. */
  kind: string;
  name: string;
  slug: string;
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

/** One tier of PC system requirements (fixed keys — the admin form and
 * the detail page render them with fixed Russian labels). */
export interface SystemRequirementsRow {
  os?: string;
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
}

/** Game system requirements: { minimum, recommended } tiers. */
export interface SystemRequirements {
  minimum?: SystemRequirementsRow;
  recommended?: SystemRequirementsRow;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  /** Activation instructions («Активация ключа» section). */
  instruction: string | null;
  /** Catalog platform facet: steam | playstation | xbox | nintendo. */
  platform: string | null;
  genre: string[];
  images: string[];
  priceCents: number;
  oldPriceCents: number | null;
  /** Cached discount percent (0 without a valid old price). */
  discountPercent: number;
  /** Cashback returned to the buyer balance, percent. */
  cashbackPercent: number;
  releaseYear: number | null;
  /** Editorial rating 0..5 shown on the card. */
  rating: number | null;
  /** Console generations («PlayStation 5», «Nintendo Switch 2»…). */
  consoles: string[];
  /** Merch badges: "hit" (Хит), "new" (Новинка) — picked from the
   * category's badge options. */
  tags: string[];
  /** Subscription service one-liner (catalog subtitle). */
  tagline: string | null;
  /** Subscription group: gaming | ai | media | social. */
  group: string | null;
  /** «Что входит» bullets of a subscription service. */
  features: string[];
  /** Folk search terms matched by catalog search. */
  searchAliases: string[];
  /** Game system requirements: { minimum, recommended } tiers. */
  systemRequirements: SystemRequirements | null;
  /** Available quantity (digital keys) in stock. */
  stock: number;
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

/** One stat card of the home trust block (before the news). */
export interface HomeStatCard {
  label: string;
  prefix: string;
  value: string;
  description: string;
}

/** One community card of the home trust block; brand picks the
 * built-in icon and tile color. */
export interface HomeCommunityCard {
  brand: "telegram" | "vk";
  name: string;
  description: string;
  usersCount: string;
  usersLabel: string;
  url: string;
}

/** Tokens ride as httpOnly cookies — the body only carries the profile. */
export interface AuthResponse {
  user: AuthUser;
}

/** Registering an email that holds a guest-checkout account parks on a
 * mailed code: the response carries no user and no session — the claim
 * completes via /auth/register/verify. */
export type RegisterResponse = AuthResponse | { verificationRequired: true };

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
/** One header-menu entry of the site settings constructor: a preset icon
 * name (see HEADER_ICONS in lib/header-icons), text and a link. */
export interface HeaderMenuItem {
  icon: string;
  label: string;
  href: string;
}

/** One footer menu: column title + its text links. */
export interface FooterMenu {
  title: string;
  items: { label: string; href: string }[];
}

export interface SiteSettings {
  id: number;
  siteName: string;
  /** Short line under/beside the logo («магазин цифровых товаров»). */
  descriptor: string;
  /** Footer brand paragraph (longer text under the logo column). */
  descriptorFooter: string;
  supportEmail: string;
  /** Legal entity requisites: footer block, documents, payment-provider
   * moderation. Empty = the block is not rendered. */
  legalName: string;
  legalInn: string;
  legalOgrn: string;
  legalAddress: string;
  legalPhone: string;
  /** Empty = no logo rendered anywhere (filled from the admin). */
  logoUrl: string;
  socials: SocialLink[];
  /** Header menu constructor items; empty = no nav rendered. */
  headerMenu: HeaderMenuItem[];
  /** Footer menu columns; empty = no menu columns rendered. */
  footerMenus: FooterMenu[];
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
  /** Primary CTA (filled style, wallet icon); empty = button hidden. */
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  /** Secondary CTA (outline style); empty = button hidden. */
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
  /** Trust block stat cards; empty = the stat cards do not render. */
  statCards: HomeStatCard[];
  /** Trust block social badge heading; empty = the community card hides. */
  communityLabel: string;
  /** Community cards (Telegram / VK); empty = the block hides. */
  communityCards: HomeCommunityCard[];
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

/** «Состояние» → «Трафик и баны» (SUPER_ADMIN): счётчики инстанса,
 * активные баны и пороги авто-бана. */
export interface TrafficSnapshotView {
  rpsLastMinute: number;
  topIps: { ip: string; requests: number }[];
  activeBans: {
    id: string;
    ip: string;
    reason: string | null;
    expiresAt: string | null;
    createdBy: string;
    createdAt: string;
  }[];
  settings: {
    autoBanEnabled: boolean;
    banThresholdRequests: number;
    banWindowSeconds: number;
    banDurationMinutes: number;
  };
}
