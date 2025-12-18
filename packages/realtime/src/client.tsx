"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  DirectMessageEvent,
  MessageReadEvent,
  ServerToClientEvents,
  TypingEvent,
} from "./types.js";

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SocketContext = createContext<ClientSocket | null>(null);

type SocketProviderProps = {
  url: string;
  token?: string;
  children: ReactNode;
};

export function SocketProvider({ url, token, children }: SocketProviderProps) {
  const [socket, setSocket] = useState<ClientSocket | null>(null);

  useEffect(() => {
    // if (!token) return; // Removed to allow cookie-based auth

    const socketInstance: ClientSocket = io(url, {
      auth: { token },
      withCredentials: true, // Send cookies
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [url, token]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return socket;
}

export function useSocketOptional() {
  return useContext(SocketContext);
}

// DM Hooks

export function useDirectMessages(
  onMessage: (msg: DirectMessageEvent) => void,
) {
  const socket = useSocketOptional();
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!socket) return;

    const handler = (msg: DirectMessageEvent) => {
      callbackRef.current(msg);
    };

    socket.on("dm", handler);
    return () => {
      socket.off("dm", handler);
    };
  }, [socket]);
}

export function useMessageReadReceipts(
  onRead: (event: MessageReadEvent) => void,
) {
  const socket = useSocketOptional();
  const callbackRef = useRef(onRead);
  callbackRef.current = onRead;

  useEffect(() => {
    if (!socket) return;

    const handler = (event: MessageReadEvent) => {
      callbackRef.current(event);
    };

    socket.on("dm_read", handler);
    return () => {
      socket.off("dm_read", handler);
    };
  }, [socket]);
}

export function useTypingIndicator(conversationId: string) {
  const socket = useSocketOptional();
  const [typingUsers, setTypingUsers] = useState<
    Map<string, { username: string; timeout: NodeJS.Timeout }>
  >(new Map());

  useEffect(() => {
    if (!socket) return;

    const handler = (data: TypingEvent) => {
      if (data.conversationId !== conversationId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.userId);

        if (existing) {
          clearTimeout(existing.timeout);
        }

        const timeout = setTimeout(() => {
          setTypingUsers((p) => {
            const n = new Map(p);
            n.delete(data.userId);
            return n;
          });
        }, 3000);

        next.set(data.userId, { username: data.username, timeout });
        return next;
      });
    };

    socket.on("dm_typing", handler);
    return () => {
      socket.off("dm_typing", handler);
      // Clear all timeouts on unmount
      for (const { timeout } of typingUsers.values()) {
        clearTimeout(timeout);
      }
    };
  }, [socket, conversationId]);

  const sendTyping = useCallback(() => {
    socket?.emit("dm_typing", { conversationId });
  }, [socket, conversationId]);

  const typingUsersList = Array.from(typingUsers.entries()).map(
    ([userId, { username }]) => ({ userId, username }),
  );

  return { typingUsers: typingUsersList, sendTyping };
}

export function useMarkMessageRead() {
  const socket = useSocketOptional();

  return useCallback(
    (conversationId: string, messageId: string) => {
      socket?.emit("dm_read", { conversationId, messageId });
    },
    [socket],
  );
}
