import { prisma } from "../config/prisma.js";

export class MemberRepository {
  static async findAll() {
    return prisma.member.findMany();
  }

  static async findById(id: string) {
    return prisma.member.findUnique({ where: { id } });
  }

  static async findByEmail(email: string) {
    return prisma.member.findUnique({ where: { email } });
  }

  static async create(data: any) {
    return prisma.member.create({ data });
  }

  static async update(id: string, data: any) {
    return prisma.member.update({ where: { id }, data });
  }

  static async updatePasswordHash(id: string, passwordHash: string) {
    return prisma.member.update({
      where: { id },
      data: { passwordHash },
    });
  }

  static async clearActiveResetTokens(memberId: string) {
    return prisma.passwordResetToken.updateMany({
      where: {
        memberId,
        usedAt: null,
      },
      data: {
        usedAt: new Date().toISOString(),
      },
    });
  }

  static async createResetToken(data: {
    id: string;
    memberId: string;
    tokenHash: string;
    expiresAt: string;
    createdAt: string;
    requestedById?: string | null;
    mode: "SELF" | "MANAGER";
  }) {
    return prisma.passwordResetToken.create({ data });
  }

  static async findActiveResetToken(memberId: string, tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        memberId,
        tokenHash,
        usedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async markResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date().toISOString() },
    });
  }

  static async delete(id: string) {
    return prisma.member.delete({ where: { id } });
  }
}
