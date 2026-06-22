import { prisma } from "../config/prisma.js";

export class SentEmailRepository {
  static async findAll() {
    return prisma.sentEmailLog.findMany({
      orderBy: { timestamp: "desc" },
    });
  }

  static async create(data: {
    id: string;
    senderId: string;
    subject: string;
    receiverName: string;
    receiverEmail: string;
    body: string;
    timestamp: string;
  }) {
    return prisma.sentEmailLog.create({ data });
  }
}
