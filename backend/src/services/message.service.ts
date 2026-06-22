import { MessageRepository } from "../repositories/message.repository.js";
import { MemberRepository } from "../repositories/member.repository.js";

export class MessageService {
  static async findAllMessages() {
    return MessageRepository.findAll();
  }

  static async getVisibleMessagesForRequester(requesterId: string) {
    if (!requesterId) {
      return [];
    }

    const requester = await MemberRepository.findById(requesterId);
    if (!requester) {
      return [];
    }

    const allMessages = await MessageRepository.findAll();
    return allMessages
      .filter(message => message.channel === "general" || message.senderId === requesterId || message.receiverId === requesterId)
      .map(message => ({
        ...message,
        text: message.text || message.content || "",
        content: message.content || message.text || "",
      }));
  }

  static async getConversationMessages(requesterId: string, contactId: string) {
    const visibleMessages = await this.getVisibleMessagesForRequester(requesterId);
    return visibleMessages.filter(
      message =>
        (message.senderId === requesterId && message.receiverId === contactId) ||
        (message.senderId === contactId && message.receiverId === requesterId)
    );
  }

  static async getMessageContacts(requesterId: string) {
    const messages = await this.getVisibleMessagesForRequester(requesterId);
    const contactsMap = new Map<
      string,
      {
        contactId: string;
        contactName: string;
        contactAvatar: string;
        lastMessageAt: string;
        lastMessagePreview: string;
      }
    >();

    for (const message of messages) {
      const isSender = message.senderId === requesterId;
      const contactId = isSender ? message.receiverId : message.senderId;
      if (!contactId) {
        continue;
      }

      const contactName = isSender ? (message.receiverName || "Unknown") : (message.senderName || "Unknown");
      const contactAvatar = isSender ? (message.receiverAvatar || "") : (message.senderAvatar || "");
      const content = (message.text || message.content || "").trim();
      const current = contactsMap.get(contactId);

      if (!current || current.lastMessageAt < message.timestamp) {
        contactsMap.set(contactId, {
          contactId,
          contactName,
          contactAvatar,
          lastMessageAt: message.timestamp,
          lastMessagePreview: content,
        });
      }
    }

    return Array.from(contactsMap.values()).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }

  static async createDirectMessage(senderId: string, receiverId: string, text: string) {
    const sender = await MemberRepository.findById(senderId);
    if (!sender) {
      throw new Error("Sender profile not found.");
    }

    const receiver = await MemberRepository.findById(receiverId);
    if (!receiver) {
      throw new Error("Receiver profile not found.");
    }

    const messageId = "msg_" + Math.random().toString(36).substr(2, 9);
    return MessageRepository.create({
      id: messageId,
      senderId,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      receiverName: receiver.name,
      receiverAvatar: receiver.avatar,
      content: text,
      text,
      channel: "dm",
      receiverId,
      timestamp: new Date().toISOString(),
    });
  }
}
