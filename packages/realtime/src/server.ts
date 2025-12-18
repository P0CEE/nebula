import type { Server as HTTPServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types.js";

export function createSocketServer(httpServer: HTTPServer, corsOrigin: string) {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    object,
    SocketData
  >(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  return io;
}

export type SocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  object,
  SocketData
>;
