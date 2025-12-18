import { trpcServer } from "@hono/trpc-server";
import { subscribeToEvents } from "@nebula/cache/events";
import { timelineCache } from "@nebula/cache/timeline-cache";
import { tasks } from "@trigger.dev/sdk/v3";
import { createTRPCContext } from "./trpc/init";
import { Hono } from "hono";
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

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3012;

subscribeToEvents(async (event) => {
  try {
    switch (event.type) {
      case "post.created":
        if (process.env.TRIGGER_SECRET_KEY) {
          await tasks.trigger("fanout-to-followers", {
            postId: event.data.postId,
            userId: event.data.userId,
            createdAt: event.data.createdAt,
          });
        } else {
          console.log(
            "[DEV] Skipping fanout trigger (no TRIGGER_SECRET_KEY)",
            event.data,
          );
        }
        break;

      case "post.deleted":
        if (process.env.TRIGGER_SECRET_KEY) {
          await tasks.trigger("remove-post-from-timelines", {
            postId: event.data.postId,
            userId: event.data.userId,
          });
        } else {
          console.log(
            "[DEV] Skipping removal trigger (no TRIGGER_SECRET_KEY)",
            event.data,
          );
        }
        break;

      case "user.followed":
      case "user.unfollowed":
        await timelineCache.invalidate(event.data.followerId);
        break;
    }
  } catch (error) {
    console.error("Failed to process event:", error);
  }
}).then(() => {
  console.log(`Timeline service subscribed to events on port ${port}`);
});

export default {
  port,
  fetch: app.fetch,
};
