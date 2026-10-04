# Deployment

Three independently deployable pieces:

```
Frontend (Next.js)  →  Vercel
Backend  (NestJS)   →  Render / Railway / any Node PaaS or Docker host
PostgreSQL          →  Neon / Supabase / any managed Postgres
```

The backend is provider-agnostic: it is a plain Node app
(`pnpm build` + `pnpm start:prod`) that connects via `DATABASE_URL`.
Do not claim a provider is free without re-checking its current plans,
limits, sleep behavior and card requirements — free tiers change.

## Runbook

### 1. Create PostgreSQL (managed)

Create a database on a managed provider. Copy the connection string, e.g.
`postgresql://user:password@host/db?sslmode=require`.

### 2. Deploy the backend

- Push the repo; create a service from `backend/` (Node build) or deploy the
  provided `backend/Dockerfile`.
- Build command: `pnpm install && pnpm build` · Start command: `pnpm start:prod`.
  Run `pnpm prisma migrate deploy` as a release step before each start
  (the Docker image does not migrate on start; the compose `migrate` service
  does it for the local full-stack profile).
- Environment:
  - `DATABASE_URL` — connection string from step 1
  - `JWT_SECRET` — long random value (`openssl rand -base64 48`)
  - `CORS_ORIGIN` — will be the frontend URL (step 3); set it after deploying
    the frontend, then redeploy the backend
  - `TRUST_PROXY` — set to `1` when the backend runs behind one reverse-proxy
    hop (PaaS default), so rate limiting sees real client IPs
  - `COOKIE_SAME_SITE` — `Lax` (default) when the site and the API share a
    host; `None` when they live on different hosts (e.g. a vercel.app site
    calling an onrender.com API): browsers drop Lax cookies on cross-site
    fetches, so login and the guest cart would silently fail. `None` always
    rides with `Secure`.
  - `NODE_ENV=production` — also disables the Swagger UI (`/api/docs`)
- Run migrations once: `pnpm prisma migrate deploy` (from `backend/`).
- Optionally seed demo data: `pnpm prisma db seed`.

### 3. Deploy the frontend (Vercel)

- Import the repo, set **Root Directory** to `frontend/`.
- Environment: `NEXT_PUBLIC_API_URL=https://<backend-host>/api`.
- Build: `pnpm build` (verified locally before deploying). No absolute local
  paths anywhere in the code.

### 4. Wire CORS

Set the backend's `CORS_ORIGIN` to the exact Vercel origin(s)
(`https://<project>.vercel.app`), comma-separated for multiple values.
Never use `origin: "*"` for the production API.

### 5. Smoke checks

1. `curl https://<backend>/api/health` → `{"status":"ok","database":"up",...}`
2. Open `https://<backend>/api/docs` → Swagger UI loads
3. Open the frontend → home page shows API/Backend/Database: OK
4. Open `/products` → seeded products render (frontend → backend → DB works)
5. Register + login through `/sign-in`, then check `/api/auth/me`

## Notes per piece

- **Frontend on Vercel**: server-rendered pages fetch the backend server-side
  (`/products`), so the backend URL must be reachable from Vercel's network.
  All frontend env vars are configured in the Vercel dashboard.
- **Backend on PaaS**: health check path is `/api/health` — configure the
  platform's health check to it. Free PaaS tiers may sleep; first request
  after sleep can be slow (and Neon free tier pauses compute similarly).
- **Database**: use the pooled connection string if the provider offers
  pooling (serverless frontend + direct Postgres connections exhaust limits).
  Run `migrate deploy` on every backend release, not `migrate dev`.

## Recipe: customer demo on free tiers (limits re-checked 2026-10-04)

The cheapest demo shape — all three pieces free, no card required:

| Piece    | Provider           | Free-tier reality (2026-10)                        |
| -------- | ------------------ | -------------------------------------------------- |
| Frontend | Vercel Hobby       | free; ToS say non-commercial — fine for a demo, not for a live store |
| Backend  | Render free        | sleeps after ~15 min idle; cold start ~30–60 s; ~750 h/mo |
| Database | Neon free          | ~0.5 GB, scale-to-zero compute, no expiry          |

Do **not** use Render's free PostgreSQL — it expires after 30 days.

Sequence (follows the Runbook above):

1. Push the repo to GitHub — **private repo**: it contains dev-only
   placeholder art (copyrighted game covers) and the demo seed.
2. Neon: create a project, copy the pooled connection string.
3. Render: new Web Service from the repo, Root Directory `backend/`,
   Build `pnpm install && pnpm build`, Start `node dist/main.js`.
   Enable pnpm via the `PNPM_VERSION` env (e.g. `12.8.1`) and pin
   `NODE_VERSION=24` (the backend has no `engines` field).
   Env: `DATABASE_URL`, `JWT_SECRET` (long random), `TRUST_PROXY=1`,
   `NODE_ENV=production`, `COOKIE_SAME_SITE=None`,
   `CORS_ORIGIN=https://<project>.vercel.app` (after step 4; update and
   redeploy once the Vercel URL exists). Health check path `/api/health`.
4. Vercel: import the repo, Root Directory `frontend/`, env
   `NEXT_PUBLIC_API_URL=https://<backend-host>.onrender.com/api`.
5. From `backend/` against the Neon URL, once:
   `pnpm prisma migrate deploy` then `pnpm prisma db seed`.
6. Smoke checks as in the Runbook, plus: log in on the deployed site —
   the session must survive a reload (proves the cross-site cookies work).

Demo caveats worth knowing:

- The first click after ~15 idle minutes hits the Render cold start
  (30–60 s). Open the site a couple of minutes before showing it.
- Uploaded images (covers, logo) are stored in Postgres, so they survive
  Render restarts and redeploys.
- The seed creates known demo credentials (`admin@gport.local` /
  `admin1234`, `admin@marketplace.local` / `admin1234`). They are public
  in the repo — before showing the admin panel to anyone outside the
  team, change the passwords through the UI.
- Vercel Hobby is non-commercial per its ToS; when the store goes live for
  real, upgrade to Pro or move the frontend to another host — the app is
  a plain Next.js build and moves as-is.

## Later hardening (not in skeleton scope)

Rate limit per user, request logging/metrics, error tracking
(e.g. Sentry), database backups.
