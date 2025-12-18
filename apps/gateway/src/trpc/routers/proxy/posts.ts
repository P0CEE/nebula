import { z } from "zod";
import { withTRPCRateLimit } from "../../../middleware/rate-limit";
import { getServiceClients } from "../../../services/clients";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../init";

const mediaTypeSchema = z.enum(["image", "video"]);

export const postsProxyRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(500),
        mediaUrl: z.string().url().optional(),
        mediaType: mediaTypeSchema.optional(),
      }),
    )
    .use(withTRPCRateLimit("post.create"))
    .mutation(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.posts.create.mutate(input);
    }),

  getById: publicProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.posts.getById.query(input);
    }),

  getByUserId: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        cursor: z.string().optional(),
        pageSize: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.posts.getByUserId.query(input);
    }),

  getRecent: publicProcedure
    .input(
      z
        .object({
          cursor: z.string().optional(),
          pageSize: z.number().min(1).max(50).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.posts.getRecent.query(input);
    }),

  delete: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .use(withTRPCRateLimit("post.delete"))
    .mutation(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.posts.delete.mutate(input);
    }),
  getMyPosts: protectedProcedure
    .input(
      z
        .object({
          cursor: z.string().optional(),
          pageSize: z.number().min(1).max(50).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.posts.getMyPosts.query(input);
    }),
});
