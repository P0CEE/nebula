import type { Database } from "@nebula/db/client";
import { connectDb } from "@nebula/db/client";
import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";

type TRPCContext = {
  db: Database;
  userId: string | null;
};

export const createTRPCContext = async (
  opts: FetchCreateContextFnOptions,
): Promise<TRPCContext> => {
  const db = await connectDb();
  const userId = opts.req.headers.get("x-user-id");

  return {
    db,
    userId,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  const { userId } = opts.ctx;

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      userId,
    },
  });
});
