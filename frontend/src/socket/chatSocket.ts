import { io, type Socket } from "socket.io-client";

let chatSocket: Socket | null = null;

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL as string;
  }

  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return `${protocol}//${host}:8080`;
};

export const getChatSocket = () => {
  if (!chatSocket) {
    chatSocket = io(getSocketUrl(), {
      path: "/socket.io",
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  return chatSocket;
};
