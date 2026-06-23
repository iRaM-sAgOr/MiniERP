import { prisma } from "../config/prisma.js";

type ProjectCreateData = {
  id: string;
  name: string;
  description: string;
  githubRepoUrl?: string | null;
  notionUrl?: string | null;
  milestonePlan?: string | null;
  standardChecklist?: string | null;
  releasePlanUrl?: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy: string;
};

type ProjectUpdateData = {
  name?: string;
  description?: string;
  githubRepoUrl?: string | null;
  notionUrl?: string | null;
  milestonePlan?: string | null;
  standardChecklist?: string | null;
  releasePlanUrl?: string | null;
  status?: string | null;
  updatedAt?: string;
};

export class ProjectRepository {
  static async findAll(options?: { includeInactive?: boolean }) {
    if (options?.includeInactive) {
      return prisma.project.findMany();
    }

    return prisma.project.findMany({
      where: {
        OR: [
          { status: null },
          { status: { not: "Inactive" } },
        ],
      },
    });
  }

  static async findById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  }

  static async create(data: ProjectCreateData) {
    return prisma.project.create({ data });
  }

  static async update(id: string, data: ProjectUpdateData) {
    return prisma.project.update({
      where: { id },
      data,
    });
  }

  static async softDelete(id: string) {
    return prisma.project.update({
      where: { id },
      data: {
        status: "Inactive",
        updatedAt: new Date().toISOString(),
      },
    });
  }
}
