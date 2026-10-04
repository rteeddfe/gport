# Backend

NestJS 12, ESM (`"type": "module"`, imports use `.js` extensions), TypeScript
strict, Vitest, oxlint. Runs on port 3001 with global prefix `/api`.

## Structure

```
src/
  main.ts                # bootstrap: prefix, helmet, CORS, pipes, filter, Swagger
  app.module.ts          # config + throttler + modules + global guards
  config/                # configuration.ts (typed config), env.validation.ts (Joi)
  database/              # PrismaModule (global), PrismaService (adapter-pg)
  common/
    decorators/          # @Public, @Roles, @CurrentUser
    guards/              # JwtAuthGuard (global), RolesGuard (global),
                         # OptionalJwtAuthGuard (cart: guest or user)
    filters/             # AllExceptionsFilter -> { statusCode, message, errors? }
    pipes/               # buildApiValidationPipe (whitelist/forbidNonWhitelisted/transform)
    interceptors/        # TimeoutInterceptor
    utils/               # slugify, cookies (guest-cart cookie helpers)
    types/               # AuthUser
  auth/                  # controller, service, dto/, strategies/jwt.strategy.ts
  users/                 # service (used by auth + jwt strategy)
  products/              # public catalog (list + slug detail w/ related)
  categories/            # read-only list
  cart/                  # guest/user cart: items, promo, totals, merge on login
  promo-codes/           # admin CRUD + discount helpers used by cart
  search/                # GET /api/search/suggest (header search hints)
  health/                # GET /api/health (api + database status)
  generated/prisma/      # generated client (gitignored)
prisma/                  # schema.prisma, migrations/, seed.ts
prisma.config.ts         # Prisma 7 CLI config (datasource url, seed command)
test/app.e2e-spec.ts     # supertest e2e
```

## Environment (backend/.env, see .env.example)

| Variable       | Purpose                              | Dev default                          |
| -------------- | ------------------------------------ | ------------------------------------ |
| `PORT`         | HTTP port                            | 3001                                 |
| `DATABASE_URL` | PostgreSQL connection string         | postgresql://postgres:postgres@localhost:55432/marketplace |
| `JWT_SECRET`   | HMAC secret for access tokens        | dev value (must be ≥16 chars)        |
| `CORS_ORIGIN`  | Comma-separated allowed origins      | http://localhost:3000                |

`JWT_SECRET` and `DATABASE_URL` are validated at boot (Joi); the app refuses
to start without them.

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
- **Rate limiting**: ThrottlerGuard globally (100 req/min per IP) via
  ThrottlerModule.

## Roles — implemented

**Implemented (in the code):** the Prisma `Role` enum has three members:

- `SUPER_ADMIN` — full administrative access. Enforced centrally in the
  global `RolesGuard`: it passes **any** `@Roles(...)` /
  `@RequirePermissions(...)` check and never depends on stored permissions.
  User management, site settings, home content, policies and FAQ admin APIs
  are `@Roles(Role.SUPER_ADMIN)`-only.
- `ADMIN` — administrative role. Domain routes carry
  `@RequirePermissions('products' | 'posts' | 'reviews' | 'promo-codes')`
  (constants in `common/constants/admin-permissions.ts`; `products` covers
  the categories tab too). An ADMIN must hold every listed permission; the
  permission set lives in `User.permissions String[]` and is reloaded by
  `JwtStrategy` on every request, so grants/revocations apply immediately.
  Permissions are managed by SUPER_ADMIN via `/api/admin/users` (the
  «Пользователи» tab). File uploads stay open to any ADMIN (shared upload
  infra for blog covers and settings images).
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

## Authentication — implemented vs not

**Implemented:** register, login, `GET /auth/me`, cookie session — the
backend sets httpOnly `access_token` (15-min JWT, also accepted as
`Authorization: Bearer` for tooling) and `refresh_token` (7-day opaque
random token, only its SHA-256 hash is stored; rotated on every
`POST /auth/refresh`, revoked on `POST /auth/logout`). `Secure` is added in
production. Auth responses carry only the profile, never tokens.

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
