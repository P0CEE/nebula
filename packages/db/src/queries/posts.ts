import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../client";
import { posts, users } from "../schema";

export const createPost = async (
  db: Database,
  data: {
    userId: string;
    content: string;
    hashtags?: string[];
    mediaUrl?: string;
    mediaType?: "image" | "video";
  },
) => {
  const [result] = await db
    .insert(posts)
    .values({
      userId: data.userId,
      content: data.content,
      hashtags: data.hashtags || [],
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
    })
    .returning({
      id: posts.id,
      userId: posts.userId,
      content: posts.content,
      hashtags: posts.hashtags,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      moderationStatus: posts.moderationStatus,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    });

  return result;
};

export const getPostById = async (db: Database, id: string) => {
  const [result] = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      content: posts.content,
      hashtags: posts.hashtags,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      moderationStatus: posts.moderationStatus,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)));

  return result ?? null;
};

export const getPostsByUserId = async (
  db: Database,
  data: {
    userId: string;
    cursor?: string;
    pageSize?: number;
  },
) => {
  const pageSize = data.pageSize || 20;
  const conditions = [eq(posts.userId, data.userId), isNull(posts.deletedAt)];

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

export const getRecentPosts = async (
  db: Database,
  data: {
    cursor?: string;
    pageSize?: number;
  },
) => {
  const pageSize = data.pageSize || 20;
  const conditions = [
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

export const deletePost = async (db: Database, id: string, userId: string) => {
  const [result] = await db
    .update(posts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, id), eq(posts.userId, userId)))
    .returning({ id: posts.id });

  return result ?? null;
};

export const updatePostModerationStatus = async (
  db: Database,
  id: string,
  status: "active" | "flagged" | "hidden" | "suspended",
) => {
  const [result] = await db
    .update(posts)
    .set({
      moderationStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning({
      id: posts.id,
      moderationStatus: posts.moderationStatus,
    });

  return result ?? null;
};

export const countPostsByUserId = async (db: Database, userId: string) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(eq(posts.userId, userId), isNull(posts.deletedAt)));

  return result?.count ?? 0;
};
