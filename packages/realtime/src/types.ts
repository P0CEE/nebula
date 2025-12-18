// Event types for Socket.io communication

export type TimelineUpdateEvent = {
  type: "new_post" | "deleted_post";
  postId: string;
  userId: string;
};

export type NotificationEvent = {
  type: "follow" | "like" | "retweet" | "reply" | "mention";
  actorId: string;
  actorUsername: string;
  postId?: string;
  timestamp: number;
};

// Direct Message events
export type DirectMessageEvent = {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: number;
};

export type MessageReadEvent = {
  conversationId: string;
  messageId: string;
  readBy: string;
  readAt: number;
};

export type TypingEvent = {
  conversationId: string;
  userId: string;
  username: string;
};

export type ServerToClientEvents = {
  timeline_update: (data: TimelineUpdateEvent) => void;
  notification: (data: NotificationEvent) => void;
  dm: (data: DirectMessageEvent) => void;
  dm_read: (data: MessageReadEvent) => void;
  dm_typing: (data: TypingEvent) => void;
};

export type ClientToServerEvents = {
  ping: () => void;
  dm_typing: (data: { conversationId: string }) => void;
  dm_read: (data: { conversationId: string; messageId: string }) => void;
};

export type SocketData = {
  userId: string;
  username?: string;
};
