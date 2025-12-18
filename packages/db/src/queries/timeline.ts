import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../client";
import { follows, posts, users } from "../schema";

export const getTimelineFromDb = async (
  db: Database,
  data: {
    userId: string;
    cursor?: string;
    pageSize?: number;
  },
) => {
  const pageSize = data.pageSize || 20;

  const followingSubquery = db
    .select({ userId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, data.userId));

  const conditions = [
    inArray(posts.userId, followingSubquery),
    isNull(posts.deletedAt),
    eq(posts.moderationStatus, "active"),
  ];

  if (data.cursor) {
    conditions.push(
      sql`${posts.createdAt} < (SELECT created_at FROM ${posts} WHERE id = ${data.cursor})`,
    );
  }

  const results = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      username: users.username,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      content: posts.content,
      hashtags: posts.hashtags,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      moderationStatus: posts.moderationStatus,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(pageSize + 1);

  const hasNextPage = results.length > pageSize;
  const data_results = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? results[pageSize]?.id : null;

  return {
    data: data_results,
    meta: {
      cursor: nextCursor,
      hasNextPage,
    },
  };
};

export const getTimelineByPostIds = async (
  db: Database,
  data: {
    postIds: string[];
    pageSize?: number;
  },
) => {
  const pageSize = data.pageSize || 20;

  const results = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      username: users.username,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      content: posts.content,
      hashtags: posts.hashtags,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      moderationStatus: posts.moderationStatus,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(
      and(
        inArray(posts.id, data.postIds),
        isNull(posts.deletedAt),
        eq(posts.moderationStatus, "active"),
      ),
    )
    .orderBy(desc(posts.createdAt));

  const orderedResults = data.postIds
    .map((id) => results.find((p) => p.id === id))
    .filter(Boolean);

  const hasNextPage = orderedResults.length > pageSize;
  const data_results = hasNextPage
    ? orderedResults.slice(0, -1)
    : orderedResults;
  const nextCursor = hasNextPage ? orderedResults[pageSize]?.id : null;

  return {
    data: data_results,
    meta: {
      cursor: nextCursor,
      hasNextPage,
    },
  };
};
