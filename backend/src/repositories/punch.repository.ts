import { prisma } from "../config/prisma.js";

export class PunchRepository {
  static async findAll() {
    return prisma.punch.findMany();
  }

  static async findByUserId(userId: string) {
    return prisma.punch.findMany({ where: { userId } });
  }

  static async create(data: { id: string; userId: string; date: string; clockIn: string; clockOut?: string | null; type: string; totalMinutes?: number | null; note: string }) {
    return prisma.punch.create({ data });
  }

  static async update(id: string, data: any) {
    return prisma.punch.update({ where: { id }, data });
  }

  static async findLatestOpenPunch(userId: string) {
    return prisma.punch.findFirst({
      where: {
        userId,
        clockOut: null,
      },
      orderBy: {
        clockIn: "desc",
      },
    });
  }
}
