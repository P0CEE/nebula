import { publishEvent } from "@nebula/cache/events";
import {
  createMessage,
  getConversationById,
  getConversationMessages,
  getOrCreateConversation,
  getUnreadCount,
  getUserById,
  getUserConversations,
  markMessageRead,
} from "@nebula/db/queries";
import { TRPCError } from "@trpc/server";
import {
  getConversationsSchema,
  getConversationWithUserSchema,
  getMessagesSchema,
  markReadSchema,
  sendMessageSchema,
} from "../schemas/message";
import { createTRPCRouter, protectedProcedure } from "./init";

export const appRouter = createTRPCRouter({
  send: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.userId;

      if (senderId === input.recipientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send message to yourself",
        });
      }

      // Get sender info for the event
      const sender = await getUserById(ctx.db, senderId);
      if (!sender) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sender not found",
        });
      }

      const conversation = await getOrCreateConversation(
        ctx.db,
        senderId,
        input.recipientId,
      );

      const message = await createMessage(ctx.db, {
        conversationId: conversation.id,
        senderId,
        content: input.content,
      });

      // Publish event for real-time delivery
      await publishEvent({
        type: "message.sent",
        data: {
          messageId: message.id,
          conversationId: conversation.id,
          senderId,
          senderUsername: sender.username,
          recipientId: input.recipientId,
          content: input.content,
          createdAt: message.createdAt,
        },
      });

      return {
        id: message.id,
        conversationId: conversation.id,
        content: message.content,
        createdAt: message.createdAt,
      };
    }),

  getConversations: protectedProcedure
    .input(getConversationsSchema.optional())
    .query(async ({ ctx, input }) => {
      const result = await getUserConversations(ctx.db, {
        userId: ctx.userId,
        cursor: input?.cursor,
        pageSize: input?.pageSize,
      });

      // Enrich with other participant info
      const enriched = await Promise.all(
        result.data.map(async (conv) => {
          const otherUserId =
            conv.participant1Id === ctx.userId
              ? conv.participant2Id
              : conv.participant1Id;

          const otherUser = await getUserById(ctx.db, otherUserId);

          return {
            id: conv.id,
            otherUser: otherUser
              ? {
                  id: otherUser.id,
                  username: otherUser.username,
                  fullName: otherUser.fullName,
                  avatarUrl: otherUser.avatarUrl,
                }
              : null,
            lastMessageAt: conv.lastMessageAt,
            createdAt: conv.createdAt,
          };
        }),
      );

      return {
        data: enriched,
        meta: result.meta,
      };
    }),

  getMessages: protectedProcedure
    .input(getMessagesSchema)
    .query(async ({ ctx, input }) => {
      // Verify user is participant
      const conversation = await getConversationById(
        ctx.db,
        input.conversationId,
      );

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const userId = ctx.userId;
      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a participant of this conversation",
        });
      }

      return getConversationMessages(ctx.db, {
        conversationId: input.conversationId,
        cursor: input.cursor,
        pageSize: input.pageSize,
      });
    }),

  markRead: protectedProcedure
    .input(markReadSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Verify user is participant
      const conversation = await getConversationById(
        ctx.db,
        input.conversationId,
      );

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a participant of this conversation",
        });
      }

      const updated = await markMessageRead(ctx.db, input.messageId, userId);

      if (updated) {
        // Get sender ID to notify them
        const senderId =
          conversation.participant1Id === userId
            ? conversation.participant2Id
            : conversation.participant1Id;

        await publishEvent({
          type: "message.read",
          data: {
            conversationId: input.conversationId,
            messageId: input.messageId,
            readBy: userId,
            senderId,
            readAt: updated.readAt!,
          },
        });
      }

      return { success: !!updated };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await getUnreadCount(ctx.db, ctx.userId);
    return { count };
  }),

  getOrCreateWithUser: protectedProcedure
    .input(getConversationWithUserSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      if (userId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create conversation with yourself",
        });
      }

      const conversation = await getOrCreateConversation(
        ctx.db,
        userId,
        input.userId,
      );

      const otherUser = await getUserById(ctx.db, input.userId);

      return {
        id: conversation.id,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              username: otherUser.username,
              fullName: otherUser.fullName,
              avatarUrl: otherUser.avatarUrl,
            }
          : null,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
      };
    }),

  // Query version for SSR prefetch
  getConversationWithUser: protectedProcedure
    .input(getConversationWithUserSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;

      if (userId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create conversation with yourself",
        });
      }

      const conversation = await getOrCreateConversation(
        ctx.db,
        userId,
        input.userId,
      );

      const otherUser = await getUserById(ctx.db, input.userId);

      return {
        id: conversation.id,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              username: otherUser.username,
              fullName: otherUser.fullName,
              avatarUrl: otherUser.avatarUrl,
            }
          : null,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
      };
    }),
});

export type AppRouter = typeof appRouter;
