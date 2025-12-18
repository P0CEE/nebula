FROM oven/bun:1-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/cache/package.json ./packages/cache/
COPY packages/logger/package.json ./packages/logger/
COPY packages/realtime/package.json ./packages/realtime/
COPY apps/services/follow/package.json ./apps/services/follow/
COPY tooling/typescript/package.json ./tooling/typescript/


# Build stage
FROM base AS builder

COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/tooling ./tooling
COPY packages ./packages
COPY apps/services/follow ./apps/services/follow
COPY turbo.json tsconfig.json ./
RUN bun install

# Production stage
FROM base AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/services/follow ./apps/services/follow

ENV NODE_ENV=production
EXPOSE 3013
CMD ["bun", "run", "apps/services/follow/src/index.ts"]
