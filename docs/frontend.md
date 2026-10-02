# Frontend

Next.js 16, App Router, React 19, TypeScript strict. Directory root is the
app root (no `src/`), import alias `@/*`.

## Structure

```
app/
  layout.tsx               # root: fonts, Providers, Header, Footer
  (public)/                # public pages: page.tsx (home), products/page.tsx
  (auth)/                  # auth pages: sign-in/page.tsx (+ centered layout)
  (dashboard)/             # protected area: dashboard/page.tsx
components/
  ui/                      # shadcn/ui primitives (button, input, form, ...)
  shared/                  # EmptyState, LoadingState, ErrorState
  layout/                  # Header (client), Footer, Container
features/
  auth/    { components/sign-in-form, hooks/use-sign-in }
  health/  { components/system-status, hooks/use-health }
  products/{ hooks/use-products }
hooks/                     # cross-feature hooks (empty for now)
lib/
  api/{client,errors,types}.ts   # fetch wrapper, ApiError, response types
  utils.ts                       # cn()
services/                  # auth, products, categories, health services
stores/                    # zustand: auth-store (in-memory token), ui-store
schemas/                   # zod: auth.schema.ts, product.schema.ts
types/                     # api.ts (DTO mirrors)
providers/                 # query-provider.tsx
tests/                     # Jest + RTL
```

## Server vs Client Components

Default is Server Component. Add `"use client"` only when the component needs
state, event handlers, browser APIs, React Query, Zustand, Framer Motion or
forms. Current client components: `Header`, `SystemStatus`, `SignInForm`,
providers. `app/(public)/products/page.tsx` is a Server Component that fetches
through the service layer — no client JS needed for it.

## API access pattern

```
component → React Query hook (features/*/hooks) → services/*.service.ts → lib/api/client.ts → NestJS
```

- `apiFetch` sends JSON, attaches `Authorization: Bearer <token>` from the
  auth store, uses `credentials: 'include'` and `cache: 'no-store'` by default,
  clears the session on 401 and throws `ApiError` with the backend's
  `{ statusCode, message, errors }` shape.
- Server Components call the same services directly (server-side fetch).

## State management

- React Query owns all server data (see `features/*/hooks/use-*.ts`).
- Zustand only for client-only state. `useAuthStore` intentionally keeps the
  JWT in memory (module scope) — nothing sensitive in localStorage. Planned
  upgrade: httpOnly refresh cookie + silent refresh; the store shape will not
  change.
- Forms: React Hook Form + `zodResolver` + schemas from `schemas/`. Forms use
  `noValidate` so Zod (not native HTML5 validation) owns error display.

## shadcn/ui

Components are installed via the shadcn CLI into `components/ui/` (Radix-based
"new-york" registry, Tailwind v4 tokens in `app/globals.css`). Adapt styling
inside those files; never re-implement a primitive that exists. Compose class
names with `cn()`.

## Framer Motion

Installed and used minimally (fade-in on `SystemStatus`). Use it for dialogs,
dropdowns, page transitions and micro-interactions later; prefer CSS when an
animation is trivial.

## Testing

Jest (+ `next/jest`), jsdom, React Testing Library. `jest.setup.ts` loads
`@testing-library/jest-dom`. Tests live in `tests/`. Mock the service layer,
not internal modules; wrap components that use React Query in
`QueryClientProvider`. Commands: `pnpm test`, `pnpm test:watch`,
`pnpm test:coverage`.

## Environment

`NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`) — the only public
variable. Everything else must stay server-side.
