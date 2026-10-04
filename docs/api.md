# API

Base URL: `http://localhost:3001/api` · Interactive docs (Swagger UI):
http://localhost:3001/api/docs · OpenAPI JSON: `/api/docs-json` (produced by
`@nestjs/swagger`).

## Endpoint map

Public catalog and cart are **implemented**. Orders, payments, acquiring,
fulfillment and top-up services are **planned but their domain model, Prisma
schema and API are NOT designed or approved yet** — nothing below should be
read as decisions about them. They will be designed per process:
business requirements → purchase flow → domain model → database model → API →
implementation.

### Public (no auth)

| Method | Path                     | Description                                                                 |
| ------ | ------------------------ | --------------------------------------------------------------------------- |
| GET    | `/health`                | `{ status, database, timestamp }`                                           |
| GET    | `/categories`            | list with `productsCount`                                                   |
| GET    | `/products`              | catalog list — PUBLISHED only; filters + sort + pagination (see below)      |
| GET    | `/products/:slug`        | product card (attributes, gallery, instruction) + `related[]` (same category, max 8) |
| GET    | `/search/suggest?q=`     | header-search hints: up to 5 products + 3 categories                        |
| GET    | `/settings`              | site settings singleton (name, logo, socials, SEO, robots.txt, manifest fields, Yandex Metrika/Webmaster fields) — self-heals on first read |
| GET    | `/home-content`          | homepage hero singleton (kicker, title, accent, subtitle, CTA, 4 tiles)     |
| GET    | `/policies`              | policy list without content: id, slug, title, sortOrder, updatedAt          |
| GET    | `/policies/:slug`        | full policy document (sanitized rich-text HTML)                             |
| GET    | `/faq`                   | active FAQ items, ordered (question, answer, category `topup`\|`games`)     |
| GET    | `/posts`                 | blog list — PUBLISHED only, newest first (`page`/`limit`)                   |
| GET    | `/posts/:slug`           | full blog post (PUBLISHED only; drafts → 404)                               |
| GET    | `/reviews`               | review list — PUBLISHED only, newest first (`page`/`limit`)                 |
| POST   | `/reviews`               | anonymous submission `{ rating 1..5, authorName?, text }` → lands in PENDING; rate limits: 1/minute per IP, 40/hour globally (429); values trimmed before validation |
| GET    | `/files/:id`             | uploaded file delivery — immutable, year-long cache                         |
| POST   | `/auth/register`         | `{ email, password, name? }`; also merges the guest cart into the new user  |
| POST   | `/auth/login`            | `{ email, password }`; also merges the guest cart into the user             |
| POST   | `/auth/logout`           | 204 (stateless JWT)                                                         |
| GET    | `/cart`                  | current cart (guest via `cart_token` HttpOnly cookie, user via JWT)         |
| POST   | `/cart/items`            | `{ productId, quantity? }` — adds; creates the guest cart + cookie          |
| PATCH  | `/cart/items/:itemId`    | `{ quantity }` (1..99)                                                      |
| DELETE | `/cart/items/:itemId`    | remove one position                                                        |
| DELETE | `/cart`                  | clear cart and promo (200 with the empty view)                              |
| POST   | `/cart/promo`            | `{ code }` — validates and applies; revalidated on every read               |
| DELETE | `/cart/promo`            | remove promo                                                               |

Cart response shape: `{ id, items: [{ id, quantity, available, product }],
subtotalCents, discountCents, totalCents, promoCode }`. Items whose product is
no longer PUBLISHED stay visible with `available: false` and are excluded from
totals. Prices are current; they get snapshotted only when orders are created.

### Product catalog filters (GET /products)

- `categorySlug` — category slug (e.g. `games`)
- `search` — case-insensitive match on title/description
- `region`, `platform` — exact match; `genre` — matches one of the array values
- `priceMin` / `priceMax` — in cents (kopecks)
- `sort` — `new` (default) | `price_asc` | `price_desc`
- `page` / `limit` (limit ≤ 100)
- `sort=popular` will appear once orders exist (needs a sales counter)

### Authenticated (JWT)

| Method | Path       | Description                                             |
| ------ | ---------- | ------------------------------------------------------- |
| GET    | `/auth/me` | current user from token (`id`, `email`, `name`, `role`, `permissions`) |

### Admin (JWT + role ADMIN + tab permission)

Domains are additionally gated by `@RequirePermissions` — an ADMIN must hold
the matching permission (granted by a SUPER_ADMIN in `/admin/users`);
SUPER_ADMIN bypasses every check:

- `products` → `/admin/products` + `/admin/categories`
- `posts` → `/admin/posts`, `reviews` → `/admin/reviews`,
  `promo-codes` → `/admin/promo-codes`

Permissions are reloaded from the DB on every request, so grants/revocations
apply immediately (no re-login needed). File uploads stay available to any
ADMIN (shared by blog covers and settings).

| Method | Path                       | Description                                        |
| ------ | -------------------------- | -------------------------------------------------- |
| GET    | `/admin/products`          | all statuses + public filters + `status`, `categoryId` |
| GET    | `/admin/products/:id`      | by uuid                                            |
| POST   | `/admin/products`          | create (title, priceCents, stock, categoryId, attributes…) |
| PATCH  | `/admin/products/:id`      | partial update; `oldPriceCents: null` clears it    |
| DELETE | `/admin/products/:id`      | delete (204); cart items cascade                   |
| POST   | `/admin/categories`        | create (`name`, optional `slug` — slugified from the name with RU translit, `description?`) |
| PATCH  | `/admin/categories/:id`    | rename/re-slug/describe; slug changes only when sent explicitly |
| DELETE | `/admin/categories/:id`    | delete (204); 409 while the category still has products |
| GET    | `/admin/posts`             | all statuses + `status` filter, paginated               |
| GET    | `/admin/posts/:id`         | by uuid                                                 |
| POST   | `/admin/posts`             | `{ title, slug?, excerpt?, content?, coverImageUrl?, status? }`; empty slug → slugified from the title (RU translit); `PUBLISHED` stamps `publishedAt` on create; dup slug → 409 |
| PATCH  | `/admin/posts/:id`         | partial update; slug changes only when sent explicitly; first `PUBLISHED` stamps `publishedAt`; `coverImageUrl: null` clears the cover |
| DELETE | `/admin/posts/:id`         | delete (204)                                            |
| GET    | `/admin/reviews`           | all reviews (every status) + `status` filter, paginated — the moderation queue |
| PATCH  | `/admin/reviews/:id`       | partial moderation update: `{ status?, rating?, authorName?, text? }` — absent fields stay untouched; empty `authorName` falls back to «Гость»; validations mirror the public form |
| DELETE | `/admin/reviews/:id`       | delete (204)                                            |
| GET    | `/admin/promo-codes`       | paginated list                                     |
| POST   | `/admin/promo-codes`       | `{ code, discountType PERCENT\|FIXED, value, isActive?, startsAt?, endsAt?, maxUses?, minSubtotalCents? }` — `value`: 1..99 (%) or kopecks; code uppercased server-side |
| PATCH  | `/admin/promo-codes/:id`   | partial update; `null` (or empty string) in `startsAt/endsAt/maxUses/minSubtotalCents` clears the field; invalid range → 400 |
| DELETE | `/admin/promo-codes/:id`   | delete (204); carts keep working via SetNull       |
| POST   | `/admin/uploads`           | multipart field `file` (png/jpeg/webp/svg/ico, ≤ 5 MB) → `{ id, filename, mimeType, size, url: /files/:id }` |

### Admin (SUPER_ADMIN only)

Site-wide content and user management are restricted to SUPER_ADMIN —
regular ADMINs get exactly the tabs their permissions cover.

| Method | Path                       | Description                                        |
| ------ | -------------------------- | -------------------------------------------------- |
| GET    | `/admin/users`             | paginated account list (`id`, `email`, `name`, `role`, `permissions`, timestamps; no password hash) |
| GET    | `/admin/users/:id`         | detail + active `sessions` (`id`, `createdAt`, `expiresAt`) |
| PATCH  | `/admin/users/:id`         | `{ role?: USER\|ADMIN, permissions?: products\|posts\|reviews\|promo-codes[] }` — permissions replace the whole set; unknown value → 400; modifying a SUPER_ADMIN or changing the own role → 400 |
| DELETE | `/admin/users/:id`         | delete (204); cart + sessions cascade; self-delete or SUPER_ADMIN target → 400 |
| DELETE | `/admin/users/:id/sessions`            | revoke all active sessions (204) — sign-out everywhere within ≤ 15 min (access-token lifetime) |
| DELETE | `/admin/users/:id/sessions/:sessionId` | revoke one session (204); unknown/already revoked → 404 |
| PUT    | `/admin/settings`          | full-object replace (every field required); `socials` = `[{ label, url, iconUrl? }]`; analytics: `metrikaCounterId` (4–14 digits or empty), `metrikaWebvisor`, `yandexVerification` (meta tag or bare code) |
| PUT    | `/admin/home-content`      | full-object replace; `tiles` is exactly 4 strings  |
| POST   | `/admin/policies`          | `{ slug, title, content (HTML), sortOrder? }` — content sanitized against a tag whitelist (`common/utils/sanitize.ts`) |
| PATCH  | `/admin/policies/:id`      | partial update; slug uniqueness → 409              |
| DELETE | `/admin/policies/:id`      | delete (204)                                       |
| GET    | `/admin/faq`               | all items including hidden ones                    |
| POST   | `/admin/faq`               | `{ question, answer, category: topup\|games, sortOrder?, isActive? }` |
| PATCH  | `/admin/faq/:id`           | partial update                                     |
| DELETE | `/admin/faq/:id`           | delete (204)                                       |

Site content flow: the storefront renders from the public GETs (root
metadata + og tags, `robots.txt` via `app/robots.txt/route.ts`, the PWA
manifest via `app/manifest.ts`, header/footer brand data, the hero banner,
the FAQ block and `/policies/[slug]`); only the writes above are
admin-gated.

Promo rules: `PERCENT` value is 1..99, `FIXED` value is in kopecks; case stored
uppercase (`welcome10` input matches `WELCOME10`). Discount is cart-wide;
percent is floored, fixed is capped at the subtotal.

`register`/`login` return `{ accessToken, user }`. The token is a standard
Bearer JWT (`Authorization: Bearer <token>`), 1 day expiry.

## Conventions

- Global prefix `/api`; plural resource nouns; kebab-case query params.
- Pagination: `?page=1&limit=10` → `{ items, total, page, limit, pages }`.
- Money is integer minor units (`priceCents`, kopecks), currency `RUB`.
- Validation errors → 400 with field map; auth failures → 401; role failures
  → 403; unique conflicts → 409; missing → 404.

## Error contract (all endpoints)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": { "email": ["email must be an email"] }
}
```

Non-validation errors use `message` only (e.g. `"Invalid email or password"`).
Stack traces never leave the server.

## Frontend integration

- Calls go through `frontend/services/*.service.ts` → `lib/api/client.ts`.
  The API client sends `credentials: 'include'`, so the guest-cart cookie
  travels automatically.
- API types are mirrored manually in `frontend/types/api.ts`.
- Planned: generate types from the OpenAPI schema (e.g. openapi-typescript)
  instead of manual mirrors — the Swagger document is already the source of
  truth.

## Roles

**Implemented:** `USER`, `ADMIN`, `SUPER_ADMIN` (Prisma `Role` enum).

- `@Roles(Role.ADMIN)` protects the `/api/admin/*` routes.
- `SUPER_ADMIN` passes any role check (centralized in the global
  `RolesGuard`) and does not depend on permissions in the database.
- `ADMIN` keeps access to the existing admin routes.
- `USER` gets `403` on role-protected routes; registration always creates a
  `USER`.
- The effective role comes from the database (reloaded per request by
  `JwtStrategy`), not from the JWT payload — role changes apply to the next
  request even for tokens issued before the change.

**Not implemented yet:** ADMIN permissions management, SUPER_ADMIN user/admin
management, session management, OAuth providers (Telegram / Yandex / VK —
when they arrive, every login method must link to **one** user account).

## Authentication state

**Implemented:** register, login, access JWT (1 day) used as `Authorization:
Bearer`, `GET /auth/me`, stateless logout.

**Not implemented yet:** refresh tokens, a persistent session model, session
revocation (incl. SUPER_ADMIN resetting all sessions of a user), and OAuth
login (Telegram / Yandex / VK). When OAuth arrives, every login method must
link to **one** user account. The implementation is intentionally undesigned
for now.

## Not implemented yet (by design)

Orders, payments/acquiring and the webhook, top-up services (Steam etc.),
fulfillment/key delivery, admin user management, orders analytics. Site
content IS implemented (settings/policies/faq/home-content/files above —
2026-10-04); what it does not cover: per-entity image galleries for
products, orders-linked content. None of the unimplemented items have an
approved domain model or API — each will be designed through
the pipeline (business requirements → purchase flow → domain model → database
model → API → implementation) before any code is written. The business
processes are tracked in [docs/business/](business/README.md).
