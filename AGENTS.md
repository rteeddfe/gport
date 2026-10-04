# AGENTS.md — Rules for AI Coding Agents

Online store for digital gaming goods and services — the store itself is the
seller; **not a marketplace** (no third-party sellers, seller accounts,
commissions or seller payouts). Stack: `frontend/` (Next.js 16) + `backend/`
(NestJS 12) + PostgreSQL (Prisma 7). Read this file before making changes.

## Golden rules

1. Study the existing architecture first; follow it. Do not rewrite working
   structure without a reason.
2. Reuse existing components, services, hooks, and utilities. Do not duplicate
   code.
3. Do not add a library when the existing stack solves the task.
4. Touch only the modules affected by the task. No drive-by refactoring.
5. Explain architectural decisions before large changes.
6. Minimal correct change > clever abstraction.

## Architecture in one screen

```
Component (Server by default)
   ↓ (client interactivity only)
React Query (server state) ──→ services/*.service.ts ──→ lib/api/client.ts ──→ NestJS REST API
Zustand (client-only UI state)                                              ↓
React Hook Form + Zod (forms)                                          Prisma
                                                                             ↓
                                                                       PostgreSQL
```

## Frontend rules (`frontend/`)

- **Server Components by default.** Add `"use client"` only for state, event
  handlers, browser APIs, React Query, Zustand, Framer Motion, forms.
- Server state → React Query (`features/*/hooks/`). Never put server data in
  Zustand. Zustand is only for client-only state (currently `stores/ui-store.ts`).
- All API calls go through `services/*.service.ts`, which use
  `lib/api/client.ts`. Never call `fetch` directly in components.
- Forms → React Hook Form + Zod resolver; schemas live in `schemas/`.
  Add `noValidate` to forms so Zod owns validation.
- UI → shadcn/ui components (`components/ui/`) + Tailwind. Do not hand-roll
  Button/Input/Dialog/etc. Compose classes with `cn()` from `@/lib/utils`.
- Keep components small; split when a component grows past ~200 lines.
- Feature code lives in `features/<domain>/{api,components,hooks,schemas,types}`.
- Tokens live only in httpOnly cookies set by the backend (`access_token`
  15 min + `refresh_token` 7 days with rotation); no tokens in localStorage
  or JS storage. The session profile comes from `GET /auth/me` via React
  Query (`features/auth/hooks/use-me.ts`). Route protection: `proxy.ts`
  (Next 16 middleware) redirects cookie-less requests from `/admin` and
  `/dashboard` to `/sign-in` — the API guards remain the source of truth.
- Types mirroring API DTOs live in `types/api.ts` (manually maintained until
  OpenAPI code generation is introduced).

## Backend rules (`backend/`)

- Module per domain (`src/<domain>/`): `module.ts`, `controller.ts`,
  `service.ts`, `dto/`. Cross-cutting code in `src/common/` and `src/config/`.
- Every incoming DTO is validated by class-validator via the global
  ValidationPipe (`whitelist`, `forbidNonWhitelisted`, `transform`). Never
  trust client input, even if the frontend validates.
- Database access only through `PrismaService` (`src/database/`).
- Routes are protected by the global `JwtAuthGuard` (mark public routes with
  `@Public()`) and the global `RolesGuard` (restrict with `@Roles(Role.ADMIN)`).
- Roles implemented: `USER`, `ADMIN`, `SUPER_ADMIN`. `SUPER_ADMIN` bypasses
  role and permission checks centrally in `RolesGuard`. ADMIN domain routes
  require permissions (`@RequirePermissions`, constants in
  `common/constants/admin-permissions.ts`, stored in `User.permissions`).
  User management (roles, permissions, session revocation) lives in
  `/admin/users` and is SUPER_ADMIN-only. Not built: granting the
  SUPER_ADMIN role via the API, OAuth (see docs/backend.md).
- Keep error responses in the filter-defined shape
  `{ statusCode, message, errors? }` — throw NestJS exceptions or use
  `{ message, errors }` payloads; never leak stack traces.
- Secrets only via environment variables (see `.env.example`). Never commit
  `.env`.
- Prisma: change `prisma/schema.prisma`, then `pnpm prisma migrate dev --name <change>`.
  Do not hand-edit files in `prisma/migrations/`.
- This is Prisma 7: the client is generated to `src/generated/prisma/` (gitignored),
  the CLI reads `prisma.config.ts`, and connections use the `@prisma/adapter-pg`
  driver adapter.

## Development Workflow

Work in small, atomic tasks.

Before changing code:

1. Study the existing architecture.
2. Locate the files related to the task.
3. Check the existing abstractions and components.
4. Do not create duplicate solutions.
5. Write a short plan of the change.
6. Implement only what the current task requires.

After changing code:

1. Typecheck.
2. ESLint.
3. Relevant tests.
4. Build, if the change affects the production build.

Do not do the following without an explicit request:

- mass refactoring;
- architecture changes;
- library replacements;
- creating new abstractions without necessity;
- changing unrelated files;
- duplicating existing components;
- adding dependencies without necessity.

If existing code can be reused — reuse it.

If the task requires an architectural decision, first explain the options and choose the minimal one.

A successful `build` is not proof of business-logic correctness or security.

Do not delete existing code just because it is currently unused.

Do not store secrets in the frontend.

Never trust client-supplied data.

All critical checks must be performed on the backend.

## Commands

| Where        | Verify                            |
| ------------ | --------------------------------- |
| `frontend/`  | `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` |
| `backend/`   | `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build` |

## Forbidden patterns

- `any` without a written justification (strict TypeScript everywhere).
- Direct `fetch` in components; direct SQL outside Prisma.
- Server data in Zustand; duplicated validation rules drift (frontend schemas
  are UX, backend DTO validation is the source of truth).
- `origin: "*"` in CORS; secrets in the frontend bundle or in git.
- Editing generated code (`frontend/.next/`, `backend/src/generated/`).
- New npm packages without checking they are actually needed.

## Testing rules

- Frontend: Jest + RTL. Test user-visible behavior (render, click, submit),
  mock the service layer, not internals. Tests live in `frontend/tests/`.
- Backend: Vitest unit tests next to the code (`*.spec.ts`), E2E in `test/`.
  Mock `PrismaService` in tests that must not touch the database.
- Do not chase 100% coverage; cover regressions and core flows.

## More documentation

`docs/architecture.md`, `docs/frontend.md`, `docs/backend.md`,
`docs/database.md`, `docs/api.md`, `docs/testing.md`, `docs/development.md`,
`docs/deployment.md`, `docs/design.md` (dark neon UX/UI spec and color
tokens — the design source of truth), and `docs/business/`
(purchase-flow requirements,
one document per process — currently placeholders awaiting requirements).
