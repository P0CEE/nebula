import { timelineCache } from "@nebula/cache/timeline-cache";
import { getFollowers, getFollowStats } from "@nebula/db/queries";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { getDb } from "../../init";
import { processBatch } from "../../utils/process-batch";

const fanoutSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export const fanoutToFollowers = schemaTask({
  id: "fanout-to-followers",
  schema: fanoutSchema,
  maxDuration: 300,
  run: async ({ postId, userId, createdAt }) => {
    const db = getDb();

    const stats = await getFollowStats(db, userId);

    if (stats.followersCount > 5000) {
      logger.info(
        `Skipping fanout for ${userId} (${stats.followersCount} followers)`,
      );
      return { strategy: "pull-on-read", followersCount: stats.followersCount };
    }

    const allFollowerIds: string[] = [];
    let cursor: string | null = null;

    do {
      const result = await getFollowers(db, {
        userId,
        cursor: cursor ?? undefined,
        pageSize: 100,
      });

      allFollowerIds.push(...result.data.map((f) => f.userId));
      cursor = result.meta.cursor ?? null;
    } while (cursor);

    await processBatch(allFollowerIds, 100, async (batch) => {
      await timelineCache.addToTimelines(batch, postId, createdAt);
      return batch;
    });

    logger.info(
      `Fanned out post ${postId} to ${allFollowerIds.length} followers`,
    );

    return { strategy: "fanout", totalFanned: allFollowerIds.length };
  },
});
