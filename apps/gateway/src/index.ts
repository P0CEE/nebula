import { trpcServer } from "@hono/trpc-server";
import { RedisCache } from "@nebula/cache/redis-client";
import { logger } from "@nebula/logger";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { withLogger } from "./middleware/logger";
import { createTRPCContext } from "./trpc/init";
import { appRouter } from "./trpc/routers/_app";

// Validate JWT_SECRET on startup
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET === "default-secret-change-in-production"
) {
  if (process.env.NODE_ENV === "production" || process.env.FLY_APP_NAME) {
    logger.error("JWT_SECRET not set in production environment");
    process.exit(1);
  }
  logger.warn("Using default JWT_SECRET - DO NOT USE IN PRODUCTION");
}

const app = new Hono();

// Health check endpoint - defined FIRST to avoid ANY middleware interference
app.get("/health", async (c) => {
  try {
    // Check Redis connection
    const redis = new RedisCache("gateway", 0);
    await redis.healthCheck();

    return c.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
          redis: "healthy",
        },
      },
      200,
    );
  } catch (error) {
    logger.error("Health check failed", { error });
    return c.json(
      {
        status: "degraded",
        message: error instanceof Error ? error.message : "Unknown error",
        services: {
          redis: "unhealthy",
        },
      },
      503,
    );
  }
});

// Security headers
app.use(secureHeaders());

// CORS
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_API_ORIGINS?.split(",") ?? [
      "http://localhost:3000",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "accept-language",
      "x-trpc-source",
      "x-user-locale",
      "x-user-timezone",
      "x-user-country",
    ],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    credentials: true,
    maxAge: 86400,
  }),
);

// Request logging
app.use(withLogger);

// tRPC server (auth handled in createContext)
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
  }),
);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "Nebula API Gateway",
    version: "0.0.1",
    endpoints: {
      health: "/health",
      trpc: "/trpc",
    },
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");

  // Wait for in-flight requests (10s timeout)
  setTimeout(() => {
    logger.info("Shutdown complete");
    process.exit(0);
  }, 10000);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");

  setTimeout(() => {
    logger.info("Shutdown complete");
    process.exit(0);
  }, 10000);
});

export default {
  port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3003,
  fetch: app.fetch,
  host: "::", // Listen on all interfaces (IPv4 + IPv6)
};
