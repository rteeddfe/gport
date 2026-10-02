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
- Build command: `pnpm install && pnpm build` · Start command: `pnpm start:prod`
  (Docker image runs `prisma migrate deploy` before start automatically).
- Environment:
  - `DATABASE_URL` — connection string from step 1
  - `JWT_SECRET` — long random value (`openssl rand -base64 48`)
  - `CORS_ORIGIN` — will be the frontend URL (step 3); set it after deploying
    the frontend, then redeploy the backend
  - `NODE_ENV=production`
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

## Later hardening (not in skeleton scope)

Refresh-token rotation with httpOnly cookies, rate limit per user, request
logging/metrics, error tracking (e.g. Sentry), database backups.
