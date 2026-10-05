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
stores/                    # zustand: ui-store (client-only UI state)
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

- `apiFetch` sends JSON, uses `credentials: 'include'` and `cache: 'no-store'`
  by default, performs one silent `POST /auth/refresh` on a 401 and throws
  `ApiError` with the backend's `{ statusCode, message, errors }` shape.
- Server Components call the same services directly (server-side fetch).
  Public GET services pass `next: { tags, revalidate: 300 }` — the Next
  Data Cache stores them under their tag (`products`, `posts`, `settings`,
  `home-content`, `categories`, `reviews`, `faq`, `policies`).
- **Revalidation**: after an admin mutation the onSuccess handler calls the
  `revalidateStorefrontTags` server action (`lib/revalidate.ts`,
  `revalidateTag(tag, "max")`), so server-rendered public pages pick the
  change up immediately; a missed call self-heals within the 300 s TTL.
- `app/(public)/loading.tsx` is the route-level streaming shell: with it in
  place, next/link's dynamic-route prefetch grabs the cheap skeleton
  instead of executing full server renders (the high-load dam), and
  navigations show it while the page streams in.

## State management

- React Query owns all server data (see `features/*/hooks/use-*.ts`).
- Zustand only for client-only state. The auth session is not stored
  client-side at all: tokens ride in httpOnly cookies set by the backend,
  `useMe` (React Query over `GET /auth/me`) is the profile source of truth,
  and `lib/api/client.ts` performs one silent `POST /auth/refresh` on a 401
  and replays the request. `proxy.ts` (Next 16 middleware) guards `/admin`
  and `/dashboard` by refresh-cookie presence.
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
