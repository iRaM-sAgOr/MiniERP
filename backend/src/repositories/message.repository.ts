import { prisma } from "../config/prisma.js";

export class MessageRepository {
  static async findAll() {
    return prisma.message.findMany({
      orderBy: {
        timestamp: "asc",
      },
    });
  }

  static async create(data: {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    receiverName?: string;
    receiverAvatar?: string;
    content?: string;
    text?: string;
    channel?: string;
    receiverId?: string;
    timestamp: string;
  }) {
    return prisma.message.create({ data });
  }

  static async findMemberById(id: string) {
    return prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });
  }
}
