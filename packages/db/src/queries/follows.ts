import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { follows, users } from "../schema";

export const createFollow = async (
  db: Database,
  followerId: string,
  followingId: string,
) => {
  if (followerId === followingId) {
    throw new Error("Cannot follow yourself");
  }

  return await db.transaction(async (tx) => {
    const [result] = await tx
      .insert(follows)
      .values({ followerId, followingId })
      .onConflictDoNothing()
      .returning({
        id: follows.id,
        followerId: follows.followerId,
        followingId: follows.followingId,
        createdAt: follows.createdAt,
      });

    if (!result) return null;

    await tx
      .update(users)
      .set({ followingCount: sql`${users.followingCount} + 1` })
      .where(eq(users.id, followerId));

    await tx
      .update(users)
      .set({ followersCount: sql`${users.followersCount} + 1` })
      .where(eq(users.id, followingId));

    return result;
  });
};

export const deleteFollow = async (
  db: Database,
  followerId: string,
  followingId: string,
) => {
  return await db.transaction(async (tx) => {
    const [result] = await tx
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      )
      .returning({ id: follows.id });

    if (!result) return null;

    await tx
      .update(users)
      .set({ followingCount: sql`${users.followingCount} - 1` })
      .where(eq(users.id, followerId));

    await tx
      .update(users)
      .set({ followersCount: sql`${users.followersCount} - 1` })
      .where(eq(users.id, followingId));

    return result;
  });
};

export const isFollowing = async (
  db: Database,
  followerId: string,
  followingId: string,
): Promise<boolean> => {
  const [result] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId),
      ),
    )
    .limit(1);

  return !!result;
};

export const getFollowers = async (
  db: Database,
  data: {
    userId: string;
    cursor?: string;
    pageSize?: number;
  },
) => {
  const pageSize = data.pageSize || 20;
  const conditions = [eq(follows.followingId, data.userId)];

  if (data.cursor) {
    conditions.push(
      sql`${follows.createdAt} < (SELECT created_at FROM ${follows} WHERE id = ${data.cursor})`,
    );
  }

  const results = await db
    .select({
      id: follows.id,
      userId: users.id,
      username: users.username,
      fullName: users.fullName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(follows.createdAt))
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

export const getFollowing = async (
  db: Database,
  data: {
    userId: string;
    cursor?: string;
    pageSize?: number;
  },
) => {
  const pageSize = data.pageSize || 20;
  const conditions = [eq(follows.followerId, data.userId)];

  if (data.cursor) {
    conditions.push(
      sql`${follows.createdAt} < (SELECT created_at FROM ${follows} WHERE id = ${data.cursor})`,
    );
  }

  const results = await db
    .select({
      id: follows.id,
      userId: users.id,
      username: users.username,
      fullName: users.fullName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(and(...conditions))
    .orderBy(desc(follows.createdAt))
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

export const getFollowStats = async (db: Database, userId: string) => {
  const [user] = await db
    .select({
      followersCount: users.followersCount,
      followingCount: users.followingCount,
    })
    .from(users)
    .where(eq(users.id, userId));

  return user ?? { followersCount: 0, followingCount: 0 };
};
