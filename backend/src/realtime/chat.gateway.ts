import type { Server, Socket } from "socket.io";
import { MessageService } from "../services/message.service.js";

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

const registerJoinHandler = (socket: Socket) => {
  socket.on("chat:join", ({ userId }: { userId?: string }) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
  });
};

const registerDirectSendHandler = (socket: Socket) => {
  socket.on("chat:direct:send", async (payload: DirectSendPayload, ack?: (response: AckPayload) => void) => {
    try {
      const senderId = payload?.senderId;
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

  io.on("connection", (socket) => {
    registerJoinHandler(socket);
    registerDirectSendHandler(socket);
  });
};
