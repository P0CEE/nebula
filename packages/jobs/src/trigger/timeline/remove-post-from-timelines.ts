import { timelineCache } from "@nebula/cache/timeline-cache";
import { getFollowers } from "@nebula/db/queries";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { getDb } from "../../init";
import { processBatch } from "../../utils/process-batch";

const removalSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const removePostFromTimelines = schemaTask({
  id: "remove-post-from-timelines",
  schema: removalSchema,
  maxDuration: 300,
  run: async ({ postId, userId }) => {
    const db = getDb();

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
      await timelineCache.removeFromTimelines(postId, batch);
      return batch;
    });

    logger.info(
      `Removed post ${postId} from ${allFollowerIds.length} timelines`,
    );

    return { totalRemoved: allFollowerIds.length };
  },
});
