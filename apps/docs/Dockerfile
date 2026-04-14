FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/docs/package.json ./apps/docs/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/tailwind-config/package.json ./packages/tailwind-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/docs/node_modules ./apps/docs/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/tailwind-config/node_modules ./packages/tailwind-config/node_modules
COPY --from=deps /app/packages/typescript-config/node_modules ./packages/typescript-config/node_modules

COPY . .

ARG LEGAL_CONTROLLER_NAME
ARG LEGAL_STREET
ARG LEGAL_CITY
ARG LEGAL_COUNTRY
ARG LEGAL_EMAIL
ARG LEGAL_HOSTING_PROVIDER

ENV LEGAL_CONTROLLER_NAME=$LEGAL_CONTROLLER_NAME
ENV LEGAL_STREET=$LEGAL_STREET
ENV LEGAL_CITY=$LEGAL_CITY
ENV LEGAL_COUNTRY=$LEGAL_COUNTRY
ENV LEGAL_EMAIL=$LEGAL_EMAIL
ENV LEGAL_HOSTING_PROVIDER=$LEGAL_HOSTING_PROVIDER

RUN pnpm turbo build --filter=@euconform/docs

# --- Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/docs/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/docs/.next/static ./apps/docs/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/docs/server.js"]
