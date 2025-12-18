import { publishEvent } from "@nebula/cache/events";
import { followsCache } from "@nebula/cache/follows-cache";
import {
  createFollow,
  deleteFollow,
  getFollowers,
  getFollowing,
  getFollowStats,
  isFollowing,
} from "@nebula/db/queries";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "./init";
import {
  followUserSchema,
  getFollowersSchema,
  getFollowingSchema,
  getFollowStatsSchema,
  isFollowingSchema,
  unfollowUserSchema,
} from "../schemas/follow";

export const appRouter = createTRPCRouter({
  follow: protectedProcedure
    .input(followUserSchema)
    .mutation(async ({ ctx, input }) => {
      const followerId = ctx.userId;
      const followingId = input.userId;

      if (followerId === followingId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot follow yourself",
        });
      }

      const result = await createFollow(ctx.db, followerId, followingId);

      if (!result) {
        return { success: true, alreadyFollowing: true };
      }

      await followsCache.invalidateAll(followerId, followingId);

      await publishEvent({
        type: "user.followed",
        data: {
          followerId,
          followingId,
          createdAt: result.createdAt,
        },
      });

      return { success: true, alreadyFollowing: false };
    }),

  unfollow: protectedProcedure
    .input(unfollowUserSchema)
    .mutation(async ({ ctx, input }) => {
      const followerId = ctx.userId;
      const followingId = input.userId;

      const result = await deleteFollow(ctx.db, followerId, followingId);

      if (!result) {
        return { success: true, wasNotFollowing: true };
      }

      await followsCache.invalidateAll(followerId, followingId);

      await publishEvent({
        type: "user.unfollowed",
        data: {
          followerId,
          followingId,
        },
      });

      return { success: true, wasNotFollowing: false };
    }),

  isFollowing: publicProcedure
    .input(isFollowingSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        return { isFollowing: false };
      }

      const followerId = ctx.userId;
      const followingId = input.userId;

      const cached = await followsCache.getIsFollowing(followerId, followingId);
      if (cached !== undefined) {
        return { isFollowing: cached };
      }

      const result = await isFollowing(ctx.db, followerId, followingId);
      await followsCache.setIsFollowing(followerId, followingId, result);

      return { isFollowing: result };
    }),

  getFollowers: publicProcedure
    .input(getFollowersSchema)
    .query(async ({ ctx, input }) => {
      const cacheKey = input.cursor || "initial";

      const cached = await followsCache.getFollowers(input.userId, cacheKey);
      if (cached) {
        return cached;
      }

      const result = await getFollowers(ctx.db, {
        userId: input.userId,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });

      await followsCache.setFollowers(input.userId, cacheKey, {
        ...result,
        meta: {
          ...result.meta,
          cursor: result.meta.cursor ?? null,
        },
      });

      return result;
    }),

  getFollowing: publicProcedure
    .input(getFollowingSchema)
    .query(async ({ ctx, input }) => {
      const cacheKey = input.cursor || "initial";

      const cached = await followsCache.getFollowing(input.userId, cacheKey);
      if (cached) {
        return cached;
      }

      const result = await getFollowing(ctx.db, {
        userId: input.userId,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });

      await followsCache.setFollowing(input.userId, cacheKey, {
        ...result,
        meta: {
          ...result.meta,
          cursor: result.meta.cursor ?? null,
        },
      });

      return result;
    }),

  getFollowStats: publicProcedure
    .input(getFollowStatsSchema)
    .query(async ({ ctx, input }) => {
      const cached = await followsCache.getStats(input.userId);
      if (cached) {
        return cached;
      }

      const stats = await getFollowStats(ctx.db, input.userId);
      await followsCache.setStats(input.userId, stats);

      return stats;
    }),
});

export type AppRouter = typeof appRouter;
