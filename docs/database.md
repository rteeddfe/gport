# Database

PostgreSQL + Prisma ORM **7**. The backend connects through the
`@prisma/adapter-pg` driver adapter (Prisma 7 is Rust-free: the client is
generated TypeScript source in `backend/src/generated/prisma/`, gitignored —
`pnpm install` runs `prisma generate` via postinstall).

## Files

```
backend/
  prisma.config.ts          # CLI: schema path, migrations dir, seed command, datasource url
  prisma/
    schema.prisma           # models + enums
    migrations/             # SQL migrations (init + catalog_cart_promo)
    seed.ts                 # test data (run: pnpm db:seed)
```

## Schema

| Model       | Fields (notable)                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`      | email (unique), passwordHash, name?, role (`USER`/`ADMIN`/`SUPER_ADMIN`), permissions `String[]` (admin tab grants, default `[]`), cart → Cart?, refreshTokens → RefreshToken[] (Cascade)                                                        |
| `Category`  | name (unique), slug (unique), description?                                                                                                    |
| `Product`   | title, slug (unique), description?, instruction?, region?, platform?, genre `String[]`, localization?, ageRating?, images `String[]`, priceCents, oldPriceCents?, stock (available keys, default 0), currency (`RUB` default), status (`DRAFT`/`PUBLISHED`/`ARCHIVED`), category → Category |
| `Cart`      | user? → User (unique, Cascade), guestToken? (unique — HttpOnly cookie `cart_token`), promoCode? → PromoCode (SetNull)                          |
| `CartItem`  | cart → Cart (Cascade), product → Product (Cascade — deleting a product removes it from carts), quantity 1..99, unique (cartId, productId)     |
| `PromoCode` | code (unique, uppercase), discountType (`PERCENT` 1..99 / `FIXED` kopecks), value, isActive, startsAt?, endsAt?, maxUses?, usedCount, minSubtotalCents? |
| `SiteSettings` | singleton (id = 1, self-heals on read): siteName, supportEmail, logoUrl, socials `Json` (`[{label, url, iconUrl?}]`), seoTitle, seoDescription, ogImageUrl?, faviconUrl, robotsTxt, manifest name/colors/icon URLs, Yandex Metrika/Webmaster fields (`metrikaCounterId`, `metrikaWebvisor`, `yandexVerification`) |
| `HomeContent` | singleton (id = 1): kicker, title, titleAccent, subtitle, ctaLabel, ctaHref, tiles `Json` (exactly 4 strings) |
| `PolicyPage` | slug (unique), title, content (sanitized rich-text HTML — tag whitelist in `common/utils/sanitize.ts`), sortOrder |
| `Post`       | title, slug (unique), excerpt, content (plain multiline text), coverImageUrl?, status (`DRAFT`/`PUBLISHED`), publishedAt? (stamped by the backend on first publish) |
| `Review`     | authorName (default «Гость»), rating 1..5, text, status (`PENDING`/`PUBLISHED`/`REJECTED`), ip? (rate limits + moderation context; windows: 1/min per IP, 40/hour global) |
| `FaqItem` | question, answer, category (`topup`/`games`), sortOrder, isActive |
| `UploadedFile` | filename, mimeType, size, data `Bytes` — served publicly via `GET /files/:id` (excluded from the `/api` prefix so stored host-relative URLs resolve on the API origin), content immutable |

Prices are stored as integer minor units (kopecks) to avoid float issues.
Enums are Postgres enums.

Planned next — **domain models NOT designed or approved yet**, listed here
only as confirmed direction: `Order`/`OrderItem` (a per-item price snapshot
at order creation is the confirmed *principle*: an OrderItem's price must not
change when the Product price changes — but the Order/OrderItem structure,
statuses, relations and API are undesigned), `Payment` + acquiring webhook,
and configurations for form-based top-up services (Steam etc.). They will be
modeled process by process: business requirements → purchase flow → domain
model → database model → API → implementation.

## Commands (in `backend/`)

| Command                    | Action                                        |
| -------------------------- | --------------------------------------------- |
| `pnpm db:migrate:dev`      | create/apply a dev migration (needs a live DB) |
| `pnpm db:migrate:deploy`   | apply pending migrations (CI/production)      |
| `pnpm db:seed`             | run seed (tsx prisma/seed.ts)                 |
| `pnpm db:generate`         | regenerate the client                         |

Note (Prisma 7): `migrate dev` no longer runs `generate` or auto-seeds — run
them explicitly. The CLI reads `DATABASE_URL` from `prisma.config.ts`
(loaded via `dotenv/config`), not from `schema.prisma`.

## Local database

- Docker: `docker compose up -d` → `localhost:55432`.
- Without Docker: `node scripts/dev-db.mjs` boots a user-space PostgreSQL 18
  (embedded-postgres) on `localhost:55432`; data lives in `backend/.pgdata`
  (gitignored). The script initialises the cluster with `--locale=C
  --encoding=UTF8` so it is independent of the host system locale.

## Seed data

`pnpm db:seed` creates (idempotent, upserts; all credentials are
development-only, never for production):

- 1 SUPER_ADMIN: `admin@marketplace.local` / `admin1234` (bcrypt hash) —
  the `marketplace` in the login is a technical artifact of the early skeleton
  name, kept unchanged
- 1 ADMIN: `admin@gport.local` / `admin1234` with every admin permission —
  so the whole role matrix (USER / ADMIN / SUPER_ADMIN) can be exercised
  locally; narrow its permissions in «Пользователи» to test restricted access
- 2 categories: Игры, Игровая валюта
- 13 published products (2 game keys with the logo fallback covers +
  11 game-currency packages with dev-only art in `frontend/public/games/`)
- 2 promo codes: `WELCOME10` (PERCENT 10), `GPORT500` (FIXED 500 ₽ from 1 500 ₽)
- SiteSettings singleton (current storefront values: GPort, support email,
  Telegram/VK placeholders, robots.txt, manifest fields)
- HomeContent singleton (the current hero banner texts and 4 advantage tiles)
- 5 policy pages (privacy/offer/refund/contacts/rightsholders) with the рыба
  rich-text copy — replaced by real legal texts in the admin editor
- 7 FAQ items (created only when the table is empty)

## Changing the schema

1. Edit `prisma/schema.prisma`.
2. `pnpm prisma migrate dev --name <change>` (local dev DB must be running).
   Prisma 7 quirk: `migrate dev` refuses non-interactive TTYs (and there is no
   `--force`); if it complains about data loss, generate the SQL with
   `pnpm prisma migrate diff --from-config-datasource --to-schema
   prisma/schema.prisma --script > prisma/migrations/<ts>_<name>/migration.sql`
   and apply with `pnpm prisma migrate deploy`.
3. `pnpm prisma generate` (Prisma 7 does not regenerate after `deploy`).
4. Commit the generated migration SQL together with the schema change.
   Never edit applied migrations by hand.
