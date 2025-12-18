import type { Session } from "@api/utils/auth";
import { logger } from "@nebula/logger";
import type { MiddlewareHandler } from "hono";

/**
 * Request/response logging middleware
 */
export const withLogger: MiddlewareHandler = async (c, next) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  // Get session if available (set by auth middleware)
  const session = c.get("session") as Session | null;

  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    userId: session?.user?.id,
    userAgent: c.req.header("user-agent"),
    ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
  });

  // Store requestId in context for later use
  c.set("requestId", requestId);

  try {
    await next();
  } finally {
    const duration = Date.now() - start;

    logger.info({
      requestId,
      duration,
      status: c.res.status,
      userId: session?.user?.id,
    });
  }
};
