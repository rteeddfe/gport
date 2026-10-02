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
    migrations/             # SQL migrations (20261003000000_init)
    seed.ts                 # test data (run: pnpm db:seed)
```

## Schema (skeleton)

| Model    | Fields (notable)                                             |
| -------- | ------------------------------------------------------------ |
| `User`   | email (unique), passwordHash, name?, role (`USER`/`ADMIN`)   |
| `Category` | name (unique), slug (unique), description?                 |
| `Product`  | title, slug (unique), description?, priceCents, currency, status (`DRAFT`/`PUBLISHED`/`ARCHIVED`), category → Category, seller? → User |

Prices are stored as integer cents to avoid float issues. Enums are Postgres
enums. Future entities (Cart, Order, OrderItem, Payment, PromoCode, Review,
Favorite, Download, License) attach naturally: e.g. `Order` → `OrderItem` →
`Product`, `Payment` → `Order`, `Download`/`License` → `OrderItem`.

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

`pnpm db:seed` creates (idempotent, upserts):

- 1 user: `admin@marketplace.local` / `admin1234` (role ADMIN, bcrypt hash)
- 2 categories: E-books, Templates
- 3 published products linked to the categories and the admin user

## Changing the schema

1. Edit `prisma/schema.prisma`.
2. `pnpm prisma migrate dev --name <change>` (local dev DB must be running).
3. Commit the generated migration SQL together with the schema change.
   Never edit applied migrations by hand.
