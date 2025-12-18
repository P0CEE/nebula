import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { Database } from "../client";
import { posts, users } from "../schema";

export const searchPosts = async (
  db: Database,
  data: { query: string; cursor?: string; pageSize?: number },
) => {
  const pageSize = data.pageSize || 20;
  const searchPattern = `%${data.query}%`;

  const conditions = [
    ilike(posts.content, searchPattern),
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
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(pageSize + 1);

  const hasNextPage = results.length > pageSize;
  const data_results = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? results[pageSize]?.id : null;

  return { data: data_results, meta: { cursor: nextCursor, hasNextPage } };
};

export const searchUsers = async (
  db: Database,
  data: { query: string; cursor?: string; pageSize?: number },
) => {
  const pageSize = data.pageSize || 20;
  const searchPattern = `%${data.query}%`;

  const conditions = [
    or(
      ilike(users.username, searchPattern),
      ilike(users.fullName, searchPattern),
    ),
  ];

  if (data.cursor) {
    conditions.push(
      sql`${users.createdAt} < (SELECT created_at FROM ${users} WHERE id = ${data.cursor})`,
    );
  }

  const results = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      followersCount: users.followersCount,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(pageSize + 1);

  const hasNextPage = results.length > pageSize;
  const data_results = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? results[pageSize]?.id : null;

  return { data: data_results, meta: { cursor: nextCursor, hasNextPage } };
};

export const searchByHashtag = async (
  db: Database,
  data: { hashtag: string; cursor?: string; pageSize?: number },
) => {
  const pageSize = data.pageSize || 20;
  const tag = data.hashtag.startsWith("#") ? data.hashtag : `#${data.hashtag}`;

  const conditions = [
    sql`${tag} = ANY(${posts.hashtags})`,
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
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(pageSize + 1);

  const hasNextPage = results.length > pageSize;
  const data_results = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? results[pageSize]?.id : null;

  return { data: data_results, meta: { cursor: nextCursor, hasNextPage } };
};
