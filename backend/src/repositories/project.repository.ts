import { prisma } from "../config/prisma.js";

export class ProjectRepository {
  static async findAll() {
    return prisma.project.findMany();
  }

  static async findById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  }

  static async create(data: { id: string; name: string; description: string; createdAt: string; createdBy: string }) {
    return prisma.project.create({ data });
  }

  static async delete(id: string) {
    return prisma.project.delete({ where: { id } });
  }
}
