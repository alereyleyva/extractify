# Worker Dockerfile (Turbo prune)
FROM oven/bun:1.3.3-alpine AS base

# Install turbo CLI
FROM base AS turbo-cli
RUN bun install -g turbo@2.6.3

# Builder stage: prune to the worker workspace
FROM turbo-cli AS builder
WORKDIR /app
COPY . .
RUN turbo prune worker --docker

# Installer stage: install deps from pruned workspace
FROM base AS installer
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --production

# Copy full pruned source
COPY --from=builder /app/out/full/ .

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=installer /app ./

WORKDIR /app/apps/worker
CMD ["bun", "run", "src/index.ts"]
