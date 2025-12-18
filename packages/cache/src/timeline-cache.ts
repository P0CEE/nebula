import { RedisCache } from "./redis-client";

const cache = new RedisCache("timeline", 300);

const isDevelopment = process.env.NODE_ENV === "development";

export const timelineCache = {
  async addToTimelines(
    followerIds: string[],
    postId: string,
    createdAt: Date,
  ): Promise<void> {
    const score = createdAt.getTime();

    for (const userId of followerIds) {
      await cache.zAdd(userId, [{ score, value: postId }]);
      await cache.expire(userId, 300);
    }
  },

  async getPostIds(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<string[] | null> {
    const maxScore = cursor ? Number.parseInt(cursor, 10) : Date.now();

    const postIds = await cache.zRevRangeByScore(userId, maxScore, "-inf", {
      LIMIT: { offset: cursor ? 1 : 0, count: limit + 1 },
    });

    return postIds.length > 0 ? postIds : null;
  },

  async setTimeline(userId: string, posts: any[]): Promise<void> {
    if (posts.length === 0) return;

    const members = posts.map((p) => ({
      score: p.createdAt.getTime(),
      value: p.id,
    }));

    await cache.zAdd(userId, members);
    await cache.expire(userId, 300);
  },

  async removeFromTimelines(
    postId: string,
    followerIds: string[],
  ): Promise<void> {
    for (const userId of followerIds) {
      await cache.zRem(userId, [postId]);
    }
  },

  async invalidate(userId: string): Promise<void> {
    await cache.delete(userId);
  },
};
