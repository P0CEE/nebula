import { randomUUID } from "node:crypto";
import type { Database } from "@nebula/db/client";
import { connectDb } from "@nebula/db/client";
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import superjson from "superjson";
import type { Session } from "../utils/auth";
import { verifyAccessToken } from "../utils/auth";
import { getGeoContext } from "../utils/geo";

export type TRPCContext = {
  db: Database;
  session: Session | null;
  geo: ReturnType<typeof getGeoContext>;
  requestId: string;
  honoContext: Context;
};

export const createTRPCContext = async (
  _opts: any,
  c: Context,
): Promise<TRPCContext> => {
  const db = await connectDb();

  // Try header first, then cookie
  let accessToken = c.req.header("Authorization")?.split(" ")[1];
  if (!accessToken) {
    accessToken = getCookie(c, "access_token");
  }

  const session = accessToken ? await verifyAccessToken(accessToken) : null;
  const geo = getGeoContext(c.req);
  const requestId = randomUUID();

  // Forward userId to services via header
  if (session) {
    c.req.raw.headers.set("X-User-Id", session.user.id);
  }

  return {
    db,
    session,
    geo,
    requestId,
    honoContext: c,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  const { session } = opts.ctx;

  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      session,
    },
  });
});
