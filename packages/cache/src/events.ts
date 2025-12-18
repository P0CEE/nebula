import { createClient } from "redis";

// Event types
export type PostCreatedEvent = {
  type: "post.created";
  data: {
    postId: string;
    userId: string;
    content: string;
    hashtags: string[];
    createdAt: Date;
  };
};

export type PostDeletedEvent = {
  type: "post.deleted";
  data: {
    postId: string;
    userId: string;
  };
};

export type UserFollowedEvent = {
  type: "user.followed";
  data: {
    followerId: string;
    followingId: string;
    createdAt: Date;
  };
};

export type UserUnfollowedEvent = {
  type: "user.unfollowed";
  data: {
    followerId: string;
    followingId: string;
  };
};

export type MessageSentEvent = {
  type: "message.sent";
  data: {
    messageId: string;
    conversationId: string;
    senderId: string;
    senderUsername: string;
    recipientId: string;
    content: string;
    createdAt: Date;
  };
};

export type MessageReadEvent = {
  type: "message.read";
  data: {
    conversationId: string;
    messageId: string;
    readBy: string;
    senderId: string;
    readAt: Date;
  };
};

export type TypingIndicatorEvent = {
  type: "typing.indicator";
  data: {
    conversationId: string;
    userId: string;
    username: string;
    recipientId: string;
  };
};

export type Event =
  | PostCreatedEvent
  | PostDeletedEvent
  | UserFollowedEvent
  | UserUnfollowedEvent
  | MessageSentEvent
  | MessageReadEvent
  | TypingIndicatorEvent;

// Redis Pub/Sub clients
let pubClient: Awaited<ReturnType<typeof createClient>> | null = null;
let subClient: Awaited<ReturnType<typeof createClient>> | null = null;

async function getPubClient() {
  if (pubClient?.isOpen) return pubClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL required for events");
  }

  const isFlyIo = !!process.env.FLY_APP_NAME;

  pubClient = createClient({
    url: redisUrl,
    socket: {
      family: isFlyIo ? 6 : 4,
      connectTimeout: 10000,
    },
  });

  pubClient.on("error", (err) => {
    console.error("Redis Pub error:", err);
  });

  await pubClient.connect();
  return pubClient;
}

async function getSubClient() {
  if (subClient?.isOpen) return subClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL required for events");
  }

  const isFlyIo = !!process.env.FLY_APP_NAME;

  subClient = createClient({
    url: redisUrl,
    socket: {
      family: isFlyIo ? 6 : 4,
      connectTimeout: 10000,
    },
  });

  subClient.on("error", (err) => {
    console.error("Redis Sub error:", err);
  });

  await subClient.connect();
  return subClient;
}

// Publish event (best-effort)
export async function publishEvent(event: Event): Promise<void> {
  try {
    const client = await getPubClient();
    await client.publish("nebula:events", JSON.stringify(event));
  } catch (error) {
    console.error("Failed to publish event:", error);
  }
}

// Subscribe to events
export async function subscribeToEvents(
  callback: (event: Event) => void | Promise<void>,
): Promise<void> {
  const client = await getSubClient();

  await client.subscribe("nebula:events", async (message) => {
    try {
      const event = JSON.parse(message) as Event;
      await callback(event);
    } catch (error) {
      console.error("Failed to process event:", error);
    }
  });
}
