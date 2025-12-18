import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { createTRPCContext } from "./trpc/init";
import { appRouter } from "./trpc/router";

const app = new Hono();

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

export default {
  port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3011,
  fetch: app.fetch,
};
