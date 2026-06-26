type SessionIdentity = {
  id: string;
  roleType: string;
  email: string;
  name?: string;
};

type SessionEntry = {
  id: string;
  roleType: string;
  email: string;
  name: string;
  socketIds: Set<string>;
};

export type OnlineSessionUser = {
  id: string;
  roleType: string;
  email: string;
  name: string;
  socketId: string;
  socketIds: string[];
};

const userSessions = new Map<string, SessionEntry>();
const socketToUser = new Map<string, string>();

const fallbackNameFromEmail = (email: string) => {
  const candidate = (email || "").split("@")[0]?.trim();
  return candidate || "Unknown";
};

export const registerSocketSession = (identity: SessionIdentity, socketId: string) => {
  if (!identity.id || !socketId) return;

  const current = userSessions.get(identity.id);
  const nextName = identity.name?.trim() || current?.name || fallbackNameFromEmail(identity.email);

  if (current) {
    current.socketIds.add(socketId);
    current.email = identity.email;
    current.roleType = identity.roleType;
    current.name = nextName;
    userSessions.set(identity.id, current);
  } else {
    userSessions.set(identity.id, {
      id: identity.id,
      roleType: identity.roleType,
      email: identity.email,
      name: nextName,
      socketIds: new Set([socketId]),
    });
  }

  socketToUser.set(socketId, identity.id);
};

export const unregisterSocketSession = (socketId: string) => {
  const userId = socketToUser.get(socketId);
  if (!userId) return;

  const session = userSessions.get(userId);
  if (!session) {
    socketToUser.delete(socketId);
    return;
  }

  session.socketIds.delete(socketId);
  if (session.socketIds.size === 0) {
    userSessions.delete(userId);
  } else {
    userSessions.set(userId, session);
  }

  socketToUser.delete(socketId);
};

export const getSocketIdsForUser = (userId: string) => {
  const session = userSessions.get(userId);
  if (!session) return [];
  return Array.from(session.socketIds.values());
};

export const getOnlineSessionUsers = () => {
  const users: OnlineSessionUser[] = [];
  for (const session of userSessions.values()) {
    const ids = Array.from(session.socketIds.values());
    users.push({
      id: session.id,
      roleType: session.roleType,
      email: session.email,
      name: session.name,
      socketId: ids[0] || "",
      socketIds: ids,
    });
  }

  return users.sort((a, b) => a.id.localeCompare(b.id));
};
