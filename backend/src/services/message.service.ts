import { MessageRepository } from "../repositories/message.repository.js";

export class MessageService {
  static async getAllMessages() {
    return MessageRepository.findAll();
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
