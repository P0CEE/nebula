import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { Database } from "../client";
import { conversations, messages, users } from "../schema";

export const getOrCreateConversation = async (
  db: Database,
  userId1: string,
  userId2: string,
) => {
  // Canonical order: smaller UUID first for unique constraint
  const [p1, p2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.participant1Id, p1),
        eq(conversations.participant2Id, p2),
      ),
    );

  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({ participant1Id: p1, participant2Id: p2 })
    .returning();

  return created!;
};

export const createMessage = async (
  db: Database,
  data: { conversationId: string; senderId: string; content: string },
) => {
  const [message] = await db.insert(messages).values(data).returning();

  // Update conversation lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: message!.createdAt })
    .where(eq(conversations.id, data.conversationId));

  return message!;
};

export const getConversationMessages = async (
  db: Database,
  data: { conversationId: string; cursor?: string; pageSize?: number },
) => {
  const pageSize = data.pageSize || 50;
  const conditions = [
    eq(messages.conversationId, data.conversationId),
    isNull(messages.deletedAt),
  ];

  if (data.cursor) {
    conditions.push(
      sql`${messages.createdAt} < (SELECT created_at FROM ${messages} WHERE id = ${data.cursor})`,
    );
  }

  const results = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      senderUsername: users.username,
      content: messages.content,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(pageSize + 1);

  const hasNextPage = results.length > pageSize;
  const data_results = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? results[pageSize]?.id : null;

  return {
    data: data_results,
    meta: { cursor: nextCursor, hasNextPage },
  };
};

export const getUserConversations = async (
  db: Database,
  data: { userId: string; cursor?: string; pageSize?: number },
) => {
  const pageSize = data.pageSize || 20;

  // Subquery for other participant info
  const results = await db
    .select({
      id: conversations.id,
      participant1Id: conversations.participant1Id,
      participant2Id: conversations.participant2Id,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(
      or(
        eq(conversations.participant1Id, data.userId),
        eq(conversations.participant2Id, data.userId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(pageSize + 1);

  const hasNextPage = results.length > pageSize;
  const data_results = hasNextPage ? results.slice(0, -1) : results;
  const nextCursor = hasNextPage ? results[pageSize]?.id : null;

  return {
    data: data_results,
    meta: { cursor: nextCursor, hasNextPage },
  };
};

export const getConversationById = async (
  db: Database,
  conversationId: string,
) => {
  const [result] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  return result ?? null;
};

export const markMessageRead = async (
  db: Database,
  messageId: string,
  userId: string,
) => {
  // Only recipient can mark as read (not sender)
  const [updated] = await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.id, messageId),
        isNull(messages.readAt),
        sql`${messages.senderId} != ${userId}`,
      ),
    )
    .returning();

  return updated ?? null;
};

export const getUnreadCount = async (db: Database, userId: string) => {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        isNull(messages.readAt),
        isNull(messages.deletedAt),
        sql`${messages.senderId} != ${userId}`,
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId),
        ),
      ),
    );

  return result?.count ?? 0;
};
