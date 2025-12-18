import { z } from "zod";
import { getServiceClients } from "../../../services/clients";
import { createTRPCRouter, publicProcedure } from "../../init";

export const searchProxyRouter = createTRPCRouter({
  posts: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        cursor: z.string().optional(),
        pageSize: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.search.posts.query(input);
    }),

  users: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        cursor: z.string().optional(),
        pageSize: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.search.users.query(input);
    }),

  hashtags: publicProcedure
    .input(
      z.object({
        hashtag: z.string().min(1).max(50),
        cursor: z.string().optional(),
        pageSize: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.search.hashtags.query(input);
    }),
});
