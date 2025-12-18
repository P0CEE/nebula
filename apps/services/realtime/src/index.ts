import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { subscribeToEvents } from "@nebula/cache/events";
import { createSocketServer } from "@nebula/realtime/server";
import { createAdapter } from "@socket.io/redis-adapter";
import { Hono } from "hono";
import { createClient } from "redis";
import { verifySocketToken } from "./utils/auth";

const app = new Hono();
app.get("/health", (c) => c.json({ status: "ok" }));

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3014;

// Create HTTP server with Bun's Hono adapter
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Convert Node request to Web Request for Hono
  const host = req.headers.host || "localhost";
  const url = `http://${host}${req.url || "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      const headerValue = Array.isArray(value) ? value[0] : value;
      if (headerValue) headers.set(key, headerValue);
    }
  }

  const request = new Request(url, {
    method: req.method,
    headers,
  });

  Promise.resolve(app.fetch(request)).then((response: Response) => {
    res.statusCode = response.status;
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });
    response.text().then((body: string) => {
      res.end(body);
    });
  });
});

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
const io = createSocketServer(httpServer, corsOrigin);

// Initialize Redis adapter
async function initRedisAdapter() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("REDIS_URL not set, running without Redis adapter");
    return;
  }

  const isFlyIo = !!process.env.FLY_APP_NAME;

  const pubClient = createClient({
    url: redisUrl,
    socket: {
      family: isFlyIo ? 6 : 4,
      connectTimeout: 10000,
    },
  });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("Redis Pub error:", err));
  subClient.on("error", (err) => console.error("Redis Sub error:", err));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Redis adapter connected");
}

// Auth middleware - verify JWT from handshake
io.use(async (socket, next) => {
  let token = socket.handshake.auth.token as string | undefined;

  // If no token in auth object, try to parse from cookie
  if (!token && socket.request.headers.cookie) {
    const cookieHeader = socket.request.headers.cookie;
    const match = cookieHeader.match(/access_token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  const session = await verifySocketToken(token);

  if (!session) {
    return next(new Error("Unauthorized"));
  }

  socket.data.userId = session.user.id;
  socket.data.username = session.user.username;
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  const username = socket.data.username;
  console.log(`User connected: ${userId}`);

  // Join user's room for targeted delivery
  socket.join(`user:${userId}`);

  // Handle typing indicator
  socket.on("dm_typing", (data) => {
    socket.to(`conversation:${data.conversationId}`).emit("dm_typing", {
      conversationId: data.conversationId,
      userId,
      username: username || "Unknown",
    });
  });

  // Handle read receipt from client
  socket.on("dm_read", (data) => {
    console.log(`Message read: ${data.messageId} by ${userId}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userId}`);
  });
});

// Subscribe to Redis events and forward to sockets
function setupEventSubscription() {
  subscribeToEvents(async (event) => {
    switch (event.type) {
      case "message.sent": {
        const { recipientId, senderId, ...messageData } = event.data;
        const createdAt =
          messageData.createdAt instanceof Date
            ? messageData.createdAt.getTime()
            : new Date(messageData.createdAt).getTime();
        // Send to recipient
        io.to(`user:${recipientId}`).emit("dm", {
          messageId: messageData.messageId,
          conversationId: messageData.conversationId,
          senderId,
          senderUsername: messageData.senderUsername,
          content: messageData.content,
          createdAt,
        });
        // Also send to sender (for multi-device sync)
        io.to(`user:${senderId}`).emit("dm", {
          messageId: messageData.messageId,
          conversationId: messageData.conversationId,
          senderId,
          senderUsername: messageData.senderUsername,
          content: messageData.content,
          createdAt,
        });
        break;
      }
      case "message.read": {
        const readAt =
          event.data.readAt instanceof Date
            ? event.data.readAt.getTime()
            : new Date(event.data.readAt).getTime();
        io.to(`user:${event.data.senderId}`).emit("dm_read", {
          conversationId: event.data.conversationId,
          messageId: event.data.messageId,
          readBy: event.data.readBy,
          readAt,
        });
        break;
      }
      case "typing.indicator": {
        io.to(`user:${event.data.recipientId}`).emit("dm_typing", {
          conversationId: event.data.conversationId,
          userId: event.data.userId,
          username: event.data.username,
        });
        break;
      }
    }
  }).catch((err) => {
    console.error("Failed to subscribe to events:", err);
  });
}

// Start the server
async function start() {
  await initRedisAdapter();
  setupEventSubscription();

  httpServer.listen(port, () => {
    console.log(`Realtime service running on port ${port}`);
  });
}

start().catch(console.error);
