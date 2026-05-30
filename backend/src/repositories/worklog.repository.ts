import { prisma } from "../config/prisma.js";

export class WorkLogRepository {
  static async findAll() {
    return prisma.workLog.findMany({
      include: {
        logItems: true,
      },
    });
  }

  static async findByUserId(userId: string) {
    return prisma.workLog.findMany({
      where: { userId },
      include: {
        logItems: true,
      },
    });
  }

  static async create(logData: {
    id: string;
    userId: string;
    date: string;
    emailDraft: string;
    emailSubject: string;
    aiSummarized: string;
    sentToTl: boolean;
    tlName?: string | null;
    tlEmail?: string | null;
    submittedAt: string;
  }, items: any[]) {
    return prisma.workLog.create({
      data: {
        ...logData,
        logItems: {
          create: items,
        },
      },
      include: {
        logItems: true,
      },
    });
  }
}
