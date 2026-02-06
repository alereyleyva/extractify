FROM oven/bun:1.3.3 AS build

WORKDIR /repo

COPY bun.lock package.json turbo.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile

RUN bun run build

FROM oven/bun:1.3.3 AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

COPY --from=build /repo/apps/web/.output /app

EXPOSE 3001

CMD ["bun", "server/index.mjs"]
