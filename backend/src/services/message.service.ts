import { MessageRepository } from "../repositories/message.repository.js";
import { MemberRepository } from "../repositories/member.repository.js";

export class MessageService {
  static async getAllMessages() {
    return MessageRepository.findAll();
  }

  static async getVisibleMessages(requesterId?: string | null) {
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

  static async createMessage(senderId: string, senderName: string, senderAvatar: string, content: string, channel: string) {
    const messageId = "msg_" + Math.random().toString(36).substr(2, 9);
    
    return MessageRepository.create({
      id: messageId,
      senderId,
      senderName,
      senderAvatar,
      content,
      channel: channel || "general",
      timestamp: new Date().toISOString(),
    });
  }

  static async createDirectMessage(senderId: string, receiverId: string, text: string) {
    const sender = await MessageRepository.findMemberById(senderId);
    if (!sender) {
      throw new Error("Sender profile not found.");
    }

    const messageId = "msg_" + Math.random().toString(36).substr(2, 9);
    return MessageRepository.create({
      id: messageId,
      senderId,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      content: text,
      text,
      channel: "dm",
      receiverId,
      timestamp: new Date().toISOString(),
    });
  }
}
