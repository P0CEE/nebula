import { timelineCache } from "@nebula/cache/timeline-cache";
import { getTimelineByPostIds, getTimelineFromDb } from "@nebula/db/queries";
import { getTimelineSchema } from "../schemas/timeline";
import { createTRPCRouter, protectedProcedure } from "./init";

export const appRouter = createTRPCRouter({
  getTimeline: protectedProcedure
    .input(getTimelineSchema.optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const pageSize = input?.pageSize || 20;

      const cachedPostIds = await timelineCache.getPostIds(
        userId,
        pageSize,
        input?.cursor,
      );

      if (cachedPostIds) {
        return getTimelineByPostIds(ctx.db, {
          postIds: cachedPostIds,
          pageSize,
        });
      }

      const result = await getTimelineFromDb(ctx.db, {
        userId,
        cursor: input?.cursor,
        pageSize,
      });

      await timelineCache.setTimeline(userId, result.data);

      return result;
    }),
});

export type AppRouter = typeof appRouter;
