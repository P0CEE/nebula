import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    username: text("username").notNull().unique(),
    fullName: text("full_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    locale: text("locale").default("en"),
    timeFormat: integer("time_format").default(24),
    dateFormat: text("date_format"),
    timezone: text("timezone"),
    timezoneAutoSync: boolean("timezone_auto_sync").default(true),
    tokenVersion: integer("token_version").default(0).notNull(),
    followersCount: integer("followers_count").default(0).notNull(),
    followingCount: integer("following_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    usernameIdx: index("users_username_idx").on(table.username),
  }),
);

export const moderationStatusEnum = pgEnum("moderation_status", [
  "active",
  "flagged",
  "hidden",
  "suspended",
]);

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    hashtags: text("hashtags").array().default([]).notNull(),
    mediaUrl: text("media_url"),
    mediaType: mediaTypeEnum("media_type"),
    moderationStatus: moderationStatusEnum("moderation_status")
      .default("active")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("posts_user_id_idx").on(table.userId),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
    moderationStatusIdx: index("posts_moderation_status_idx").on(
      table.moderationStatus,
    ),
  }),
);

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    followerIdx: index("follows_follower_id_idx").on(table.followerId),
    followingIdx: index("follows_following_id_idx").on(table.followingId),
    uniqueFollow: unique("follows_follower_following_unique").on(
      table.followerId,
      table.followingId,
    ),
  }),
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participant1Id: uuid("participant1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participant2Id: uuid("participant2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    participant1Idx: index("conversations_participant1_idx").on(
      table.participant1Id,
    ),
    participant2Idx: index("conversations_participant2_idx").on(
      table.participant2Id,
    ),
    uniqueConversation: unique("conversations_participants_unique").on(
      table.participant1Id,
      table.participant2Id,
    ),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_id_idx").on(
      table.conversationId,
    ),
    senderIdx: index("messages_sender_id_idx").on(table.senderId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  }),
);
