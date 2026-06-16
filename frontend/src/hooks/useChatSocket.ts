import { useEffect, useRef } from 'react';
import { getChatSocket, setChatSocketAuthToken } from '../socket/chatSocket';
import { DirectMessage } from '../types';

function upsertMessage(current: DirectMessage[], incoming: any): DirectMessage[] {
  const normalized: DirectMessage = {
    id: incoming.id,
    senderId: incoming.senderId,
    receiverId: incoming.receiverId,
    senderName: incoming.senderName,
    text: incoming.text || incoming.content || '',
    timestamp: incoming.timestamp,
  };

  const existingIndex = current.findIndex(m => m.id === normalized.id);
  if (existingIndex >= 0) {
    const next = [...current];
    next[existingIndex] = normalized;
    return next;
  }

  return [...current, normalized];
}

interface UseChatSocketOptions {
  authToken: string;
  currentMemberId: string;
  activeTabRef: React.MutableRefObject<string>;
  selectedChatUserIdRef: React.MutableRefObject<string>;
  onNewMessage: (updater: (prev: DirectMessage[]) => DirectMessage[]) => void;
  onUnseenUpdate: (senderId: string) => void;
}

export function useChatSocket({
  authToken,
  currentMemberId,
  activeTabRef,
  selectedChatUserIdRef,
  onNewMessage,
  onUnseenUpdate,
}: UseChatSocketOptions) {
  const socketRef = useRef<ReturnType<typeof getChatSocket> | null>(null);

  useEffect(() => {
    const socket = getChatSocket();
    socketRef.current = socket;
    setChatSocketAuthToken(authToken);

    const handleIncomingMessage = (message: DirectMessage) => {
      onNewMessage(prev => upsertMessage(prev, message));
      if (message.senderId && message.senderId !== currentMemberId) {
        const chatOpen =
          activeTabRef.current === 'messages' &&
          selectedChatUserIdRef.current === message.senderId;
        if (!chatOpen) {
          onUnseenUpdate(message.senderId);
        }
      }
    };

    socket.on('chat:direct:new', handleIncomingMessage);

    if (authToken) {
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.off('chat:direct:new', handleIncomingMessage);
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    setChatSocketAuthToken(authToken);
    if (authToken) {
      socket.connect();
    } else {
      socket.disconnect();
    }
  }, [authToken]);

  return socketRef;
}

export { upsertMessage };
