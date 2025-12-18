import { RedisCache } from "@nebula/cache/redis-client";
import { TRPCError } from "@trpc/server";

const LIMITS = {
  "follow.create": { limit: 20, windowMs: 60_000 },
  "follow.delete": { limit: 20, windowMs: 60_000 },
  "post.create": { limit: 10, windowMs: 60_000 },
  "post.delete": { limit: 20, windowMs: 60_000 },
  "media.delete": { limit: 10, windowMs: 60_000 },
};

const rateLimitCache = new RedisCache("ratelimit", 0);

export const withTRPCRateLimit = (operation: keyof typeof LIMITS) => {
  return async (opts: any) => {
    const { ctx } = opts;
    const userId = ctx.session.user.id;
    const config = LIMITS[operation];

    const key = `${operation}:${userId}`;

    try {
      const count = await rateLimitCache.incr(key);

      if (count === 1) {
        await rateLimitCache.expire(key, Math.ceil(config.windowMs / 1000));
      }

      if (count > config.limit) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded: ${config.limit} requests per minute`,
        });
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      // FAIL OPEN: Allow request on Redis error (better UX, avoid false blocks)
      console.error("Rate limit check failed, allowing request:", error);
    }

    return opts.next();
  };
};
