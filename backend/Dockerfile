# Multi-stage production image. The runner stage installs production
# dependencies only — dev/toolchain packages (and their advisories) never
# reach the runtime image. Database migrations run via the docker-compose
# "migrate" service or a PaaS release command, not at container start.

# ---- build: full toolchain, compile the app ----
FROM node:24-alpine AS build
RUN npm i -g pnpm@12.8.1
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm prisma generate && pnpm build

# ---- prod-deps: runtime dependency tree without lifecycle scripts ----
FROM node:24-alpine AS prod-deps
RUN npm i -g pnpm@12.8.1
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# ---- runner: dist + production node_modules only, non-root ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma.config.ts ./
COPY prisma ./prisma
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
