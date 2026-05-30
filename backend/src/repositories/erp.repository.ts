import { prisma } from "../config/prisma.js";

export class ErpRepository {
  static async findRequesterById(id: string) {
    return prisma.member.findUnique({
      where: { id },
      select: { id: true, roleType: true, email: true },
    });
  }

  static async findStateMembers() {
    return prisma.member.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roleType: true,
        avatar: true,
        department: true,
        punchStatus: true,
        lastPunchTime: true,
        isTL: true,
        tlId: true,
        agreementHours: true,
        breakDay: true,
      },
    });
  }

  static async findPunches() {
    return prisma.punch.findMany();
  }

  static async findWorkLogs() {
    return prisma.workLog.findMany({
      include: {
        logItems: true,
      },
    });
  }

  static async findTasks() {
    return prisma.task.findMany({
      include: {
        comments: true,
        history: true,
        subtasks: true,
      },
    });
  }

  static async findMessages() {
    return prisma.message.findMany({
      orderBy: { timestamp: "asc" },
    });
  }

  static async findProjects() {
    return prisma.project.findMany();
  }

  static async findSentEmails() {
    return prisma.sentEmailLog.findMany({
      orderBy: { timestamp: "desc" },
    });
  }

  static async findWorkLogById(id: string) {
    return prisma.workLog.findUnique({ where: { id } });
  }

  static async findMemberById(id: string) {
    return prisma.member.findUnique({ where: { id } });
  }

  static async updateWorkLogDispatch(worklogId: string, emailSubject: string, emailDraft: string) {
    return prisma.workLog.update({
      where: { id: worklogId },
      data: {
        sentToTl: true,
        emailSubject,
        emailDraft,
      },
    });
  }

  static async createSentEmailLog(data: {
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

  static async deleteAllState() {
    await prisma.message.deleteMany();
    await prisma.sentEmailLog.deleteMany();
    await prisma.subtask.deleteMany();
    await prisma.historyEvent.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.workLogItem.deleteMany();
    await prisma.workLog.deleteMany();
    await prisma.punch.deleteMany();
    await prisma.project.deleteMany();
    await prisma.member.deleteMany();
  }

  static async createMembers(members: Array<Record<string, unknown>>) {
    return prisma.member.createMany({ data: members });
  }

  static async createProjects(projects: Array<Record<string, unknown>>) {
    return prisma.project.createMany({ data: projects });
  }
}