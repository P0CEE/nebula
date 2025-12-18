import { z } from "zod";

export const sendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export const getConversationsSchema = z.object({
  cursor: z.string().uuid().optional(),
  pageSize: z.number().min(1).max(50).optional(),
});

export const getMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  pageSize: z.number().min(1).max(100).optional(),
});

export const markReadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
});

export const getConversationWithUserSchema = z.object({
  userId: z.string().uuid(),
});
