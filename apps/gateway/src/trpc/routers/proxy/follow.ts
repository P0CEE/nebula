import { z } from "zod";
import { withTRPCRateLimit } from "../../../middleware/rate-limit";
import { getServiceClients } from "../../../services/clients";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../init";

export const followProxyRouter = createTRPCRouter({
  follow: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .use(withTRPCRateLimit("follow.create"))
    .mutation(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.follow.follow.mutate(input);
    }),

  unfollow: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .use(withTRPCRateLimit("follow.delete"))
    .mutation(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.follow.unfollow.mutate(input);
    }),

  isFollowing: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.follow.isFollowing.query(input);
    }),

  getFollowers: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        cursor: z.string().optional(),
        pageSize: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.follow.getFollowers.query(input);
    }),

  getFollowing: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        cursor: z.string().optional(),
        pageSize: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.follow.getFollowing.query(input);
    }),

  getFollowStats: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session?.user.id);
      return clients.follow.getFollowStats.query(input);
    }),
});
