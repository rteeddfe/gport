# Backend

NestJS 12, ESM (`"type": "module"`, imports use `.js` extensions), TypeScript
strict, Vitest, oxlint. Runs on port 3001 with global prefix `/api`.

## Structure

```
src/
  main.ts                # bootstrap: prefix, helmet, CORS, pipes, filter, Swagger
  app.module.ts          # config + rate-limit guard + modules + global guards
  config/                # configuration.ts (typed config), env.validation.ts (Joi)
  database/              # PrismaModule (global), PrismaService (adapter-pg)
  common/
    decorators/          # @Public, @Roles, @RequirePermissions, @CurrentUser
    guards/              # RateLimitGuard (global rate limit), JwtAuthGuard,
                         # RolesGuard (all global, in that order)
    filters/             # AllExceptionsFilter -> { statusCode, message, errors? }
    pipes/               # buildApiValidationPipe (whitelist/forbidNonWhitelisted/transform)
    interceptors/        # TimeoutInterceptor
    utils/               # slugify, cookies (session cookie helpers)
    types/               # AuthUser
  auth/                  # controller, service, dto/, strategies/jwt.strategy.ts
  users/                 # service (used by auth + jwt strategy)
  products/              # public catalog (list + slug detail w/ related)
  categories/            # read-only list (productsCount = PUBLISHED only)
  promo-codes/           # admin CRUD (no public listing — codes go off-site)
  search/                # GET /api/search/suggest (header search hints)
  health/                # GET /api/health (api + database status)
  generated/prisma/      # generated client (gitignored)
prisma/                  # schema.prisma, migrations/, seed.ts
prisma.config.ts         # Prisma 7 CLI config (datasource url, seed command)
test/app.e2e-spec.ts     # supertest e2e
```

## Environment (backend/.env, see .env.example)

| Variable                  | Purpose                              | Dev default                          |
| ------------------------- | ------------------------------------ | ------------------------------------ |
| `PORT`                    | HTTP port                            | 3001                                 |
| `DATABASE_URL`            | PostgreSQL connection string         | postgresql://postgres:postgres@localhost:55432/marketplace |
| `JWT_SECRET`              | HMAC secret for access tokens        | dev value (must be ≥16 chars)        |
| `CORS_ORIGIN`             | Comma-separated allowed origins      | http://localhost:3000                |
| `PAYMENTS_WEBHOOK_SECRET` | Test-acquiring webhook HMAC (shared with the frontend emulator route) | dev fallback (REQUIRED ≥32 chars in production) |
| `STOREFRONT_ORIGIN`       | Absolute storefront origin for payment redirects | first `CORS_ORIGIN` entry |

`JWT_SECRET`, `DATABASE_URL` and (in production) `PAYMENTS_WEBHOOK_SECRET`
are validated at boot (Joi); the app refuses to start without them.

## Conventions

- **Auth**: global `JwtAuthGuard` + `@Public()` for open routes;
  `RolesGuard` + `@Roles(Role.ADMIN)` for admin operations. JWT payload:
  `{ sub, email, role }`, strategy reloads the user from DB on every request.
- **Validation**: every request body/query goes through DTOs with
  class-validator decorators. The pipe returns field-keyed errors:
  `errors: { email: ["email must be an email"] }`.
- **Errors**: throw NestJS built-ins (`NotFoundException`, `ConflictException`,
  `UnauthorizedException`, ...) or pass `{ message, errors }` payloads.
  `AllExceptionsFilter` normalizes everything, maps Prisma errors
  (P2002 → 409, P2025 → 404) and never leaks stack traces.
- **Swagger**: generated from DTOs via the `@nestjs/swagger` CLI plugin
  (nest-cli.json). Mark auth endpoints with `@ApiBearerAuth()`.
- **Rate limiting**: `RateLimitGuard` globally (100 req/min per IP,
  in-memory sliding window — ESM-safe replacement for @nestjs/throttler,
  whose CJS build crashes the Vercel function against the ESM-only
  @nestjs/common 12); sensitive routes tighten it with `@RateLimit` — login
  5/min, register 3/min, refresh 30/min, order create 5/min, payment
  webhook 30/min, search suggest 60/min. Reviews and support keep their own
  DB-counted sliding-window limits (1/min per IP + 30/h global).
- **Sessions**: refresh tokens rotate on every refresh and share a
  `familyId`; replaying a REVOKED token revokes the whole family (reuse
  detection — a stolen cookie kills its own session). Expired rows are
  purged opportunistically on login.

## Roles — implemented

**Implemented (in the code):** the Prisma `Role` enum has three members:

- `SUPER_ADMIN` — full administrative access. Enforced centrally in the
  global `RolesGuard`: it passes **any** `@Roles(...)` /
  `@RequirePermissions(...)` check and never depends on stored permissions.
  User management, site settings, home content, policies and FAQ admin APIs
  are `@Roles(Role.SUPER_ADMIN)`-only.
- `ADMIN` — administrative role. Domain routes carry
  `@RequirePermissions('products' | 'orders' | 'files' | 'posts' | 'reviews' | 'promo-codes')`
  (constants in `common/constants/admin-permissions.ts`; `products` covers
  the categories tab too). An ADMIN must hold every listed permission; the
  permission set lives in `User.permissions String[]` and is reloaded by
  `JwtStrategy` on every request, so grants/revocations apply immediately.
  Permissions are managed by SUPER_ADMIN via `/api/admin/users` (the
  «Пользователи» tab). Delivered key values in admin order views are
  SUPER_ADMIN-only (plain ADMINs with the «orders» permission see the
  order without key values). File uploads require the «files» permission
  (shared upload infra for blog covers and settings images).
- `USER` — buyer. Gets `403` on any role- or permission-protected route.

Registration always creates a `USER`. The role and permissions in a JWT
payload are informational only: `JwtStrategy` reloads the user from the
database on every request, so an access change takes effect on the very next
request — an old token can never grant more than what is currently stored.

Safety rails in `UsersService`: a SUPER_ADMIN account cannot be modified or
deleted, and a SUPER_ADMIN cannot change their own role (protects against
complete lock-out). Session revocation (`DELETE /admin/users/:id/sessions`,
single or all) marks the stored refresh tokens revoked — the user is signed
out everywhere once their 15-minute access token expires.

**Not implemented yet (do not build without a request):** assigning the
`SUPER_ADMIN` role through the API (only USER↔ADMIN), OAuth providers.

## Orders & payments (direct purchase, 2026-10-05)

The store is the seller; checkout is DIRECT (the cart module, its tables
and the login merge were REMOVED on 2026-10-05 — nothing creates carts).
Pipeline per purchase: `POST /orders`
{ productId, quantity 1..10, provider, email? } (signed-in users) →
validates PUBLISHED + stock + provider enabled, snapshots the price into
the OrderItem, opens a payment session and returns `redirectUrl` → the
buyer pays at the provider → the provider's webhook confirms → the order
turns PAID (the AWAITING_PAYMENT→PAID claim is an atomic conditional
update, so duplicate webhooks cannot double-issue keys), the stock
decrements and the auto-delivery keys are assigned (`ProductKey` rows
marked sold) — products without keys deliver their
`instruction` text. Letters (invoice + paid/keys) go through MailService
into the `EmailLog` outbox: **no SMTP provider yet, the rows are the
delivery**.

- `src/orders/` — `POST /orders` is **@Public since 2026-10-05**: guests
  buy with just an email. With a session the order attaches to the user;
  without one the email (trimmed, lowercased) finds or creates a
  **passwordless holder account** (`User.passwordHash` is nullable) —
  login against it fails 401, and `POST /auth/register` with the same
  email CLAIMS the account (sets the password/name, same id) so the
  purchases appear in the new session. Admin `GET /admin/orders` (+
  `:id`) with `@Roles(ADMIN)` — read-only, statuses move via webhooks
  only. Order statuses: AWAITING_PAYMENT → PAID | CANCELLED.
- Product FAQ (2026-10-05): `ProductFaq` model (question/answer,
  sortOrder = list order) — public detail `GET /products/:slug` carries
  `faq`, admin `GET/PUT /admin/products/:id/faq` replaces the whole list
  (same idiom as the keys endpoint).
- `src/payments/` — PaymentSettings singleton (testEnabled + per-provider
  { enabled, config }), `GET /payments/methods` (public, enabled only),
  admin `GET/PUT /admin/payments/settings` + `GET /admin/payments/emails`
  (@Roles SUPER_ADMIN). The TEST emulator: session token stored on the
  order, `GET /payments/test/session/:token` (public — the token is the
  capability), `POST /payments/webhook/test` (public) verifies an
  HMAC-SHA256 signature over `orderId:token:status` (PAYMENTS_WEBHOOK_
  SECRET, shared with the frontend emulator route handler) and is
  idempotent. Real acquirers are registered in
  `common/constants/payment-providers.ts` (Т-Банк, ЮMoney, ЮKassa,
  CloudPayments, Robokassa — config storage only, `live: false`) and
  integrate inside `PaymentsService.createPaymentSession`.
- Admin key management: `GET/PUT /admin/products/:id/keys` replaces the
  UNSOLD keys (sold rows are history); `stock` decrements on payment.
- Product stock is NOT reserved at order creation — an abandoned payment
  session never eats stock; concurrent last-key buys are resolved by the
  `isSold: false` guard in the assignment query (an order may pay with
  fewer keys assigned — the UI shows what was delivered).

## Authentication — implemented vs not

**Implemented:** register, login, `GET /auth/me`, cookie session — the
backend sets httpOnly `access_token` (15-min JWT, also accepted as
`Authorization: Bearer` for tooling) and `refresh_token` (7-day opaque
random token, only its SHA-256 hash is stored; rotated on every
`POST /auth/refresh`, revoked on `POST /auth/logout`). `Secure` is added in
production. Auth responses carry only the profile, never tokens.

**Self-service profile (2026-10-05):** `PATCH /auth/me` updates `name` /
`avatarUrl` (app path, `/files/:id` upload or https URL; an empty string
clears the field) and returns the fresh profile; `POST /auth/password`
verifies `currentPassword`, replaces the hash and revokes every other
refresh token — the calling session stays alive. There is still no
email-based "forgot password" flow (no mail provider).

**Not implemented (planned, no design yet):** "revoke all sessions" for a
user (rows are per-device, so mass revocation is a service method away),
reuse-theft detection (revoked-token replay should kill the whole family),
and OAuth login (Telegram / Yandex / VK). The future OAuth model must
link every login method to **one** user account — never one user per method.
The implementation shape (cookies, session storage, revocation mechanics) is
deliberately undesigned until the corresponding design stage.

## Adding a new domain module (recipe)

1. `src/<domain>/dto/*.dto.ts` — class-validator DTOs.
2. `src/<domain>/<domain>.service.ts` — business logic via `PrismaService`.
3. `src/<domain>/<domain>.controller.ts` — routes, `@ApiTags`, guards.
4. `src/<domain>/<domain>.module.ts`, register in `app.module.ts`.
5. Unit test (`*.spec.ts`) next to the service; e2e in `test/` if needed.

Use `products/` as the reference implementation (pagination, filters,
slug generation, role-protected writes).

## Testing

- Unit (Vitest): `pnpm test` — specs live next to the code.
- E2E: `pnpm test:e2e` — boots the full AppModule with `PrismaService`
  mocked, hits real HTTP endpoints via supertest.
- Typecheck `pnpm typecheck`, lint `pnpm lint` (oxlint type-aware).

## Production

```bash
pnpm build        # nest build -> dist/
pnpm start:prod   # node dist/main.js
```

`backend/Dockerfile` is multi-stage: the runner stage installs production
dependencies only (dev/toolchain packages and their advisories never reach the
runtime image) and runs as a non-root user. Database migrations run via the
docker-compose `migrate` service or a PaaS release command — not at container
start.
