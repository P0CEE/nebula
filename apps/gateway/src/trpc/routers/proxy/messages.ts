import { z } from "zod";
import { getServiceClients } from "../../../services/clients";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const messagesProxyRouter = createTRPCRouter({
  send: protectedProcedure
    .input(
      z.object({
        recipientId: z.string().uuid(),
        content: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.messages.send.mutate(input);
    }),

  getConversations: protectedProcedure
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
      return clients.messages.getConversations.query(input);
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        cursor: z.string().optional(),
        pageSize: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.messages.getMessages.query(input);
    }),

  markRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        messageId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.messages.markRead.mutate(input);
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const clients = getServiceClients(ctx.session.user.id);
    return clients.messages.getUnreadCount.query();
  }),

  getOrCreateWithUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.messages.getOrCreateWithUser.mutate(input);
    }),

  getConversationWithUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const clients = getServiceClients(ctx.session.user.id);
      return clients.messages.getConversationWithUser.query(input);
    }),
});
