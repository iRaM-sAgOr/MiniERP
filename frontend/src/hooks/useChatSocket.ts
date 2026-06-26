import { useEffect, useRef } from 'react';
import { getChatSocket, setChatSocketAuthToken } from '../socket/chatSocket';
import { DirectMessage, OnlineMessageUser } from '../types';

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
  onPresenceSync: (users: OnlineMessageUser[]) => void;
}

export function useChatSocket({
  authToken,
  currentMemberId,
  activeTabRef,
  selectedChatUserIdRef,
  onNewMessage,
  onUnseenUpdate,
  onPresenceSync,
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

    const handlePresenceSnapshot = (payload: { users?: OnlineMessageUser[] }) => {
      onPresenceSync(payload?.users || []);
    };

    const handleConnect = () => {
      socket.emit('chat:presence:request');
    };

    socket.on('chat:direct:new', handleIncomingMessage);
    socket.on('chat:presence:snapshot', handlePresenceSnapshot);
    socket.on('connect', handleConnect);

    if (authToken) {
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.off('chat:direct:new', handleIncomingMessage);
      socket.off('chat:presence:snapshot', handlePresenceSnapshot);
      socket.off('connect', handleConnect);
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
