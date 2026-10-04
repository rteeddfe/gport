# Architecture

## Project type

An ordinary **online store for digital gaming goods and services**. The store
itself is the seller of everything in the catalog. It is **not a marketplace**:
the domain model must not contain third-party sellers, seller/vendor accounts,
storefronts, commissions or marketplace payment splits. Strings like
`marketplace` that remain in technical identifiers (`admin@marketplace.local`
seed login, the local database name, the frontend placeholder title) are
legacy artifacts of the early skeleton name — nothing more.

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
                          products, categories, cart, promo-codes, search,
                          health)
src/common/             — guards (JwtAuthGuard, RolesGuard), filters
                          (AllExceptionsFilter), pipes, decorators, utils
src/database/           — PrismaModule (global) + PrismaService
src/generated/prisma/   — generated Prisma client (gitignored)
```

Request pipeline: helmet → CORS → ThrottlerGuard → JwtAuthGuard (@Public to
opt out) → RolesGuard (@Roles) → ValidationPipe → controller → service → Prisma.
Errors funnel through `AllExceptionsFilter` into the unified error shape.

## Data model

**Implemented:** `User` (Role: USER | ADMIN | SUPER_ADMIN — SUPER_ADMIN
bypasses role checks in `RolesGuard`), `Category`, `Product`
(ProductStatus, price in minor units, attributes: region, platform, genre,
localization, age rating, images, instruction, old price), `Cart` +
`CartItem` (guest via cookie or user-bound), `PromoCode`
(PERCENT | FIXED). See docs/database.md for details.

**Planned — domain model, Prisma schema and API are NOT designed or approved
yet:** Order / OrderItem (with a per-item price snapshot), Payment and the
acquiring webhook, top-up service configurations. They will be designed
process by process (see below). Do not treat them as existing decisions.

## Business processes (purchase flows)

The store sells different kinds of goods and services, and each kind is a
**distinct business process** — they must not be forced into one universal
purchase abstraction:

- Steam Top Up (wallet balance by login) — see docs/business/steam-topup.md
- Steam Gift (gifting a game to an account) — see docs/business/steam-gift.md
- Game Purchase (activation keys) — see docs/business/games.md
- Game Currency Top Up (in-game currency/UID top-ups) — see
  docs/business/game-currency.md
- Subscription (recurring/voucher services) — see docs/business/subscriptions.md

In particular **Steam Top Up ≠ Steam Gift**: different inputs, different
fulfillment, different failure modes. All five flow documents currently have
the status "requirements not specified yet"; entity structures will be defined
only after each process has been described.

Every new business feature follows the same design pipeline:

```
Business requirements → Purchase flow → Domain model → Database model → API → Implementation
```

## Key decisions and their rationale

| Decision | Why |
| --- | --- |
| Separate apps, no monorepo tooling yet | Two packages are simple to maintain; workspaces can be introduced when shared code appears |
| pnpm everywhere | Fast, strict, one lockfile per app |
| Prisma 6→7 with driver adapters | Matches the official Prisma 7 + ESM path that NestJS 12 uses (`"type": "module"`) |
| JWT access token in memory on the client | No localStorage; refresh-cookie flow can be added without rewriting consumers |
| Global guards + @Public decorator | Secure by default: a forgotten @Public fails closed |
| Roles: three-tier enum, SUPER_ADMIN bypasses checks in the guard | SUPER_ADMIN → full access (independent of DB permissions), ADMIN → current role-based access (permissions are future work), USER → no admin access; centralized in RolesGuard, not per-controller |
| Orders/payments designed before coding | Pipeline: business requirements → purchase flow → domain model → database model → API → implementation; no code for undesigned processes |
| OpenAPI-first API docs | Swagger is generated from DTOs (`@nestjs/swagger` CLI plugin); types will be generated for the frontend later |
