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
    guards/              # JwtAuthGuard (global), RolesGuard (global)
    filters/             # AllExceptionsFilter -> { statusCode, message, errors? }
    pipes/               # buildApiValidationPipe (whitelist/forbidNonWhitelisted/transform)
    interceptors/        # TimeoutInterceptor
    utils/               # slugify
    types/               # AuthUser
  auth/                  # controller, service, dto/, strategies/jwt.strategy.ts
  users/                 # service (used by auth + jwt strategy)
  products/              # full CRUD reference implementation
  categories/            # read-only list
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
  `RolesGuard` + `@Roles(Role.ADMIN)` for write operations. JWT payload:
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

`backend/Dockerfile` builds a production image that runs
`prisma migrate deploy` before starting the server.
