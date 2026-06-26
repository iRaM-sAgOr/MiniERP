import type { Server, Socket } from "socket.io";
import { MessageService } from "../services/message.service.js";
import { verifyAuthToken } from "../middleware/auth.middleware.js";
import {
  getOnlineSessionUsers,
  registerSocketSession,
  unregisterSocketSession,
} from "./socket-session.store.js";

type DirectSendPayload = {
  senderId: string;
  receiverId: string;
  text: string;
};

type AckPayload = {
  ok: boolean;
  message?: any;
  error?: string;
};

type SocketUser = {
  id: string;
  roleType: string;
  email: string;
  name?: string;
};

let ioRef: Server | null = null;

const mapMessageForClient = (message: any) => ({
  ...message,
  text: message.text || message.content || "",
  content: message.content || message.text || "",
});

export const emitDirectMessage = (message: any) => {
  if (!ioRef) return;

  const payload = mapMessageForClient(message);
  ioRef.to(`user:${payload.senderId}`).emit("chat:direct:new", payload);
  if (payload.receiverId) {
    ioRef.to(`user:${payload.receiverId}`).emit("chat:direct:new", payload);
  }
};

export const getOnlineUsers = () => {
  return getOnlineSessionUsers().map((user) => ({
    userId: user.id,
    name: user.name,
    roleType: user.roleType,
    email: user.email,
    socketId: user.socketId,
    socketIds: user.socketIds,
    socketCount: user.socketIds.length,
  }));
};

const emitPresenceSnapshot = () => {
  if (!ioRef) return;
  ioRef.emit("chat:presence:snapshot", {
    users: getOnlineUsers(),
    updatedAt: new Date().toISOString(),
  });
};

const registerJoinHandler = (socket: Socket) => {
  socket.on("chat:join", ({ userId }: { userId?: string }) => {
    const user = socket.data.user as SocketUser | undefined;
    if (!user || !userId || user.id !== userId) return;
    socket.join(`user:${user.id}`);
  });
};

const registerDirectSendHandler = (socket: Socket) => {
  socket.on("chat:direct:send", async (payload: DirectSendPayload, ack?: (response: AckPayload) => void) => {
    try {
      const user = socket.data.user as SocketUser | undefined;
      const senderId = user?.id;
      const receiverId = payload?.receiverId;
      const text = payload?.text?.trim();

      if (!senderId || !receiverId || !text) {
        ack?.({ ok: false, error: "Invalid message payload." });
        return;
      }

      const message = await MessageService.createDirectMessage(senderId, receiverId, text);
      emitDirectMessage(message);
      ack?.({ ok: true, message: mapMessageForClient(message) });
    } catch (err: any) {
      ack?.({ ok: false, error: err?.message || "Failed to send message." });
    }
  });
};

export const initChatGateway = (io: Server) => {
  ioRef = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) {
        return next(new Error("JWT token is required."));
      }

      socket.data.user = verifyAuthToken(token);
      return next();
    } catch {
      return next(new Error("JWT token has expired or is invalid."));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser | undefined;
    if (user?.id) {
      socket.join(`user:${user.id}`);
      registerSocketSession(user, socket.id);
      emitPresenceSnapshot();
    }

    registerJoinHandler(socket);
    registerDirectSendHandler(socket);

    socket.on("disconnect", () => {
      unregisterSocketSession(socket.id);
      emitPresenceSnapshot();
    });

    socket.on("chat:presence:request", () => {
      socket.emit("chat:presence:snapshot", {
        users: getOnlineUsers(),
        updatedAt: new Date().toISOString(),
      });
    });
  });
};
