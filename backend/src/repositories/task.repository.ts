import { prisma } from "../config/prisma.js";

export class TaskRepository {
  static async findPaginated(options: {
    where?: any;
    skip: number;
    take: number;
    orderBy?: any;
  }) {
    const { where, skip, take, orderBy } = options;
    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { createdAt: "desc" },
        include: {
          comments: true,
          history: true,
          subtasks: true,
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { items, total };
  }

  static async findAll() {
    return prisma.task.findMany({
      include: {
        comments: true,
        history: true,
        subtasks: true,
      },
    });
  }

  static async findById(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        comments: true,
        history: true,
        subtasks: true,
      },
    });
  }

  static async create(data: {
    id: string;
    title: string;
    description: string;
    assignedTo: string;
    assignedBy: string;
    status: string;
    priority: string;
    dueDate: string;
    createdAt: string;
    projectName: string;
    estimatedHours: number;
    actualHours: number;
    startDate: string;
    endDate: string;
  }) {
    return prisma.task.create({
      data: {
        ...data,
      },
      include: {
        comments: true,
        history: true,
        subtasks: true,
      },
    });
  }

  static async update(id: string, updateData: any) {
    return prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        comments: true,
        history: true,
        subtasks: true,
      },
    });
  }

  static async incrementActualHours(id: string, hours: number) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return null;
    return prisma.task.update({
      where: { id },
      data: {
        actualHours: {
          increment: hours,
        },
      },
    });
  }

  static async createComment(data: {
    id: string;
    taskId: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    text: string;
    createdAt: string;
  }) {
    return prisma.comment.create({
      data,
    });
  }

  static async createHistoryEvent(data: {
    id: string;
    taskId: string;
    actorId: string;
    actorName: string;
    type: string;
    detail: string;
    timestamp: string;
  }) {
    return prisma.historyEvent.create({
      data,
    });
  }

  static async syncSubtasks(taskId: string, subtasks: Array<{ id: string; title: string; isCompleted: boolean }>) {
    // Elegant way to sync: delete former subtasks of the task first, then re-insert them
    await prisma.subtask.deleteMany({
      where: { taskId },
    });
    
    if (subtasks.length > 0) {
      await prisma.subtask.createMany({
        data: subtasks.map(s => ({
          id: s.id,
          taskId: taskId,
          title: s.title,
          isCompleted: s.isCompleted,
        })),
      });
    }

    return prisma.task.findUnique({
      where: { id: taskId },
      include: {
        comments: true,
        history: true,
        subtasks: true,
      },
    });
  }

  static async delete(id: string) {
    return prisma.task.delete({ where: { id } });
  }
}
