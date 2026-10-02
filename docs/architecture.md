# Architecture

## Overview

Two independent applications connected only by REST/JSON over HTTP:

```
┌─────────────────────┐         ┌─────────────────────┐         ┌────────────┐
│ Next.js (frontend)  │  HTTP   │ NestJS (backend)    │  SQL    │ PostgreSQL │
│ port 3000           │ ──────> │ port 3001           │ ──────> │ port 55432 │
│ App Router, RSC     │  JSON   │ REST API, Swagger   │ Prisma  │            │
└─────────────────────┘         └─────────────────────┘         └────────────┘
```

- The frontend never talks to PostgreSQL directly and holds no secrets.
- The backend is the only owner of the database and of business rules.
- Both apps are deployed independently (see docs/deployment.md).

## Frontend layering

```
app/(route-groups)/page.tsx     — routing, Server Components by default
  └─ features/<domain>/         — feature logic: hooks, api, components
       └─ services/*.service.ts — typed REST calls per domain
            └─ lib/api/client.ts — single fetch wrapper (base URL, JSON,
                                    auth header, error normalization)
```

State split:

- **Server state** (data from the API): TanStack Query — fetching, caching,
  retries, invalidation. Never copied into Zustand.
- **Client state**: Zustand, only for truly global UI concerns
  (`stores/ui-store.ts` — mobile menu, `stores/auth-store.ts` — in-memory
  session token/user).
- **Forms**: React Hook Form + Zod schemas from `schemas/`.

## Backend layering

```
main.ts                 — bootstrap: global prefix /api, helmet, CORS,
                          ValidationPipe, exception filter, Swagger
src/app.module.ts       — ConfigModule (Joi-validated env), ThrottlerModule,
                          feature modules, global guards
src/<domain>/           — module + controller + service + dto/ (auth, users,
                          products, categories, health)
src/common/             — guards (JwtAuthGuard, RolesGuard), filters
                          (AllExceptionsFilter), pipes, decorators, utils
src/database/           — PrismaModule (global) + PrismaService
src/generated/prisma/   — generated Prisma client (gitignored)
```

Request pipeline: helmet → CORS → ThrottlerGuard → JwtAuthGuard (@Public to
opt out) → RolesGuard (@Roles) → ValidationPipe → controller → service → Prisma.
Errors funnel through `AllExceptionsFilter` into the unified error shape.

## Data model (skeleton)

`User` (Role: USER|ADMIN) — `Product` (ProductStatus, price in cents,
`Category` relation). Intentionally minimal; the schema is designed so Cart,
Order, OrderItem, Payment, PromoCode, Review, Favorite, Download and License
can be added later without structural rewrites (see docs/database.md).

## Key decisions and their rationale

| Decision | Why |
| --- | --- |
| Separate apps, no monorepo tooling yet | Two packages are simple to maintain; workspaces can be introduced when shared code appears |
| pnpm everywhere | Fast, strict, one lockfile per app |
| Prisma 6→7 with driver adapters | Matches the official Prisma 7 + ESM path that NestJS 12 uses (`"type": "module"`) |
| JWT access token in memory on the client | No localStorage; refresh-cookie flow can be added without rewriting consumers |
| Global guards + @Public decorator | Secure by default: a forgotten @Public fails closed |
| OpenAPI-first API docs | Swagger is generated from DTOs (`@nestjs/swagger` CLI plugin); types will be generated for the frontend later |
