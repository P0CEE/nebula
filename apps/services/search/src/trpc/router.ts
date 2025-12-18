import { searchByHashtag, searchPosts, searchUsers } from "@nebula/db/queries";
import { searchHashtagSchema, searchQuerySchema } from "../schemas/search";
import { createTRPCRouter, publicProcedure } from "./init";

export const appRouter = createTRPCRouter({
  posts: publicProcedure
    .input(searchQuerySchema)
    .query(async ({ ctx, input }) => {
      return searchPosts(ctx.db, {
        query: input.query,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });
    }),

  users: publicProcedure
    .input(searchQuerySchema)
    .query(async ({ ctx, input }) => {
      return searchUsers(ctx.db, {
        query: input.query,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });
    }),

  hashtags: publicProcedure
    .input(searchHashtagSchema)
    .query(async ({ ctx, input }) => {
      return searchByHashtag(ctx.db, {
        hashtag: input.hashtag,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });
    }),
});

export type AppRouter = typeof appRouter;
