import { RedisCache } from "./redis-client";

// Cache pour le feed public (heavy read)
const feedCache = new RedisCache("posts:feed", 5 * 60); // 5 min TTL

const isDevelopment = process.env.NODE_ENV === "development";

export interface CachedPost {
  id: string;
  userId: string;
  content: string;
  hashtags: string[];
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  moderationStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedFeedResponse {
  data: CachedPost[];
  meta: {
    cursor: string | null;
    hasNextPage: boolean;
  };
}

export const postsCache = {
  // Get feed from cache
  getFeed: (
    pageSize: number,
    cacheKey: string,
  ): Promise<CachedFeedResponse | undefined> => {
    if (isDevelopment) return Promise.resolve(undefined);
    const key = `${pageSize}:${cacheKey}`;
    return feedCache.get<CachedFeedResponse>(key);
  },

  // Set feed in cache
  setFeed: (
    pageSize: number,
    cacheKey: string,
    posts: CachedPost[],
  ): Promise<void> => {
    if (isDevelopment) return Promise.resolve();
    const key = `${pageSize}:${cacheKey}`;

    const hasNextPage = posts.length > pageSize;
    const data_results = hasNextPage ? posts.slice(0, -1) : posts;
    const nextCursor = hasNextPage ? posts[pageSize]?.id : null;

    const response: CachedFeedResponse = {
      data: data_results,
      meta: {
        cursor: nextCursor || null,
        hasNextPage,
      },
    };

    return feedCache.set(key, response);
  },
};
