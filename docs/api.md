# API

Base URL: `http://localhost:3001/api` · Interactive docs (Swagger UI):
http://localhost:3001/api/docs · OpenAPI JSON: `/api/docs-json` (produced by
`@nestjs/swagger`).

## Implemented endpoints (skeleton)

| Method | Path                 | Auth      | Description                          |
| ------ | -------------------- | --------- | ------------------------------------ |
| GET    | `/health`            | public    | `{ status, database, timestamp }`    |
| GET    | `/products`          | public    | paginated list                       |
| GET    | `/products/:id`      | public    | single product                       |
| POST   | `/products`          | ADMIN JWT | create                               |
| PATCH  | `/products/:id`      | ADMIN JWT | partial update                       |
| DELETE | `/products/:id`      | ADMIN JWT | delete (204)                         |
| GET    | `/categories`        | public    | list with `productsCount`            |
| POST   | `/auth/register`     | public    | `{ email, password, name? }`         |
| POST   | `/auth/login`        | public    | `{ email, password }`                |
| POST   | `/auth/logout`       | public    | 204 (stateless JWT)                  |
| GET    | `/auth/me`           | JWT       | current user from token              |

`register`/`login` return `{ accessToken, user }`. The token is a standard
Bearer JWT (`Authorization: Bearer <token>`), 1 day expiry.

## Conventions

- Global prefix `/api`; plural resource nouns; kebab-case query params.
- Pagination: `?page=1&limit=10` (limit ≤ 100) →
  `{ items, total, page, limit, pages }`.
- Filtering: `?status=PUBLISHED&categoryId=<uuid>&search=<text>` (products).
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
- API types are mirrored manually in `frontend/types/api.ts`.
- Planned: generate types from the OpenAPI schema (e.g. openapi-typescript)
  instead of manual mirrors — the Swagger document is already the source of
  truth.

## Not implemented yet (by design)

Cart, orders, payments, file uploads/downloads, reviews, promo codes, refresh
tokens, seller role. The architecture (modules, DTO validation, guards,
filter, Prisma schema) is prepared for them — see docs/backend.md for the
"add a module" recipe.
