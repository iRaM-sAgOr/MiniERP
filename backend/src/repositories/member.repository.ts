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

  static async delete(id: string) {
    return prisma.member.delete({ where: { id } });
  }
}
