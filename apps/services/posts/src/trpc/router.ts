import { publishEvent } from "@nebula/cache/events";
import { postsCache } from "@nebula/cache/posts-cache";
import {
  createPost,
  deletePost,
  getPostById,
  getPostsByUserId,
  getRecentPosts,
  updatePostModerationStatus,
} from "@nebula/db/queries";
import { TRPCError } from "@trpc/server";
import {
  createPostSchema,
  deletePostSchema,
  extractHashtags,
  getPostByIdSchema,
  getPostsByUserIdSchema,
  getRecentPostsSchema,
  updateModerationStatusSchema,
} from "../schemas/post";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "./init";

export const appRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Extract hashtags from content
      const hashtags = extractHashtags(input.content);

      const post = await createPost(ctx.db, {
        userId,
        content: input.content,
        hashtags,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
      });

      if (!post) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create post",
        });
      }

      await publishEvent({
        type: "post.created",
        data: {
          postId: post.id,
          userId: post.userId,
          content: post.content,
          hashtags: post.hashtags,
          createdAt: post.createdAt,
        },
      });

      return post;
    }),

  getById: publicProcedure
    .input(getPostByIdSchema)
    .query(async ({ ctx, input }) => {
      const post = await getPostById(ctx.db, input.postId);

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      return post;
    }),

  getByUserId: publicProcedure
    .input(getPostsByUserIdSchema)
    .query(async ({ ctx, input }) => {
      return getPostsByUserId(ctx.db, {
        userId: input.userId,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });
    }),

  getRecent: publicProcedure
    .input(getRecentPostsSchema.optional())
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize || 20;
      const cacheKey = input?.cursor || "initial";
      const cached = await postsCache.getFeed(pageSize, cacheKey);

      if (cached) {
        return cached;
      }

      const result = await getRecentPosts(ctx.db, {
        cursor: input?.cursor,
        pageSize: input?.pageSize,
      });

      await postsCache.setFeed(pageSize, cacheKey, result.data);

      return result;
    }),

  delete: protectedProcedure
    .input(deletePostSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      const deleted = await deletePost(ctx.db, input.postId, userId);

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found or unauthorized",
        });
      }

      await publishEvent({
        type: "post.deleted",
        data: {
          postId: input.postId,
          userId,
        },
      });

      return { success: true };
    }),

  updateModerationStatus: protectedProcedure
    .input(updateModerationStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const updated = await updatePostModerationStatus(
        ctx.db,
        input.postId,
        input.status,
      );

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      return updated;
    }),

  getMyPosts: protectedProcedure
    .input(getRecentPostsSchema.optional())
    .query(async ({ ctx, input }) => {
      return getPostsByUserId(ctx.db, {
        userId: ctx.userId,
        cursor: input?.cursor,
        pageSize: input?.pageSize,
      });
    }),
});

export type AppRouter = typeof appRouter;
