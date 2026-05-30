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
}
