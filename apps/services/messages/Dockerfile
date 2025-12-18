FROM oven/bun:1-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/cache/package.json ./packages/cache/
COPY packages/logger/package.json ./packages/logger/
COPY apps/services/messages/package.json ./apps/services/messages/
COPY tooling/typescript/package.json ./tooling/typescript/
RUN bun install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/tooling ./tooling
COPY packages ./packages
COPY apps/services/messages ./apps/services/messages
COPY turbo.json tsconfig.json ./
RUN bun install

FROM base AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/services/messages ./apps/services/messages

ENV NODE_ENV=production
EXPOSE 3018
CMD ["bun", "run", "apps/services/messages/src/index.ts"]
