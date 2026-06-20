import { WorkLogRepository } from "../repositories/worklog.repository.js";
import { MemberRepository } from "../repositories/member.repository.js";
import { TaskRepository } from "../repositories/task.repository.js";
import { prisma } from "../config/prisma.js";

export class WorkLogService {
  static buildEmailDraft(memberName: string, tlName: string, date: string, items: Array<{ project: string; category: string; description: string; hoursSpent: number }>) {
    return `Dear ${tlName},\n\nPlease find my daily work update for ${date}:\n\n${items.map(it => `- ${it.project} [${it.category}]: ${it.description} (${it.hoursSpent}h)`).join('\n')}\n\nRegards,\n${memberName}`;
  }

  static async getAllWorkLogs() {
    return WorkLogRepository.findAll();
  }

  static async getWorkLogsByUserId(userId: string) {
    return WorkLogRepository.findByUserId(userId);
  }

  static async getVisibleWorkLogs(requesterId?: string | null) {
    if (!requesterId) {
      return [];
    }

    const requester = await MemberRepository.findById(requesterId);
    const isManager = (requester?.roleType || "").toLowerCase() === "manager";
    const worklogs = isManager ? await WorkLogRepository.findAll() : await WorkLogRepository.findByUserId(requesterId);

    return worklogs.map(worklog => ({
      ...worklog,
      items: worklog.logItems,
      assignedTL: { name: worklog.tlName || "", email: worklog.tlEmail || "" },
    }));
  }

  static async createOrReplaceWorkLog(
    userId: string,
    items: Array<{ project: string; category: string; description: string; hoursSpent: number; taskId?: string }>,
    assignedTL?: { name: string; email: string }
  ) {
    const member = await MemberRepository.findById(userId);
    if (!member) {
      throw new Error(`Member profile with ID ${userId} was not found.`);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let tl = assignedTL;
    if (!tl) {
      const mappedLead = member.tlId ? await MemberRepository.findById(member.tlId) : null;
      if (mappedLead) {
        tl = { name: mappedLead.name, email: mappedLead.email };
      }
    }
    if (!tl) {
      const allMembers = await MemberRepository.findAll();
      const firstManager = allMembers.find(m => (m.roleType || "").toLowerCase() === "manager");
      if (firstManager) {
        tl = { name: firstManager.name, email: firstManager.email };
      }
    }
    if (!tl) {
      tl = { name: "Team Lead", email: "unassigned@minierp.local" };
    }

    const emailSubject = `Daily Work Report - ${member.name} (${todayStr})`;
    const aiSummarized = "";
    const emailDraft = this.buildEmailDraft(member.name, tl.name, todayStr, items);

    const logId = "wl_" + Math.random().toString(36).substr(2, 9);
    const logData = {
      id: logId,
      userId,
      date: todayStr,
      emailDraft,
      emailSubject,
      aiSummarized,
      sentToTl: false,
      tlName: tl.name,
      tlEmail: tl.email,
      submittedAt: new Date().toISOString(),
    };

    // Before inserting, check if a work log already exists for this user today, and delete it to preserve "replace" logic (KISS)
    const existingLogs = await prisma.workLog.findMany({
      where: {
        userId,
        date: todayStr,
      },
    });

    for (const log of existingLogs) {
      await prisma.workLog.delete({ where: { id: log.id } });
    }

    const created = await WorkLogRepository.create(
      logData,
      items.map((it, index) => ({
        id: `wli_${logId}_${index}`,
        project: it.project,
        category: it.category,
        description: it.description,
        hoursSpent: Number(it.hoursSpent),
        taskId: it.taskId || null,
      }))
    );

    // Recalculate Actual Hours on all reference tasks
    await this.recalculateAllTaskActualHours();

    return created;
  }

  static async appendItem(
    userId: string,
    item: { project: string; category: string; description: string; hoursSpent: number; githubLink?: string; taskId?: string },
    assignedTL?: { name: string; email: string }
  ) {
    const member = await MemberRepository.findById(userId);
    if (!member) {
      throw new Error(`Member profile with ID ${userId} was not found.`);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let tl = assignedTL;
    if (!tl) {
      const mappedLead = member.tlId ? await MemberRepository.findById(member.tlId) : null;
      if (mappedLead) tl = { name: mappedLead.name, email: mappedLead.email };
    }
    if (!tl) {
      const allMembers = await MemberRepository.findAll();
      const firstManager = allMembers.find(m => (m.roleType || "").toLowerCase() === "manager");
      if (firstManager) tl = { name: firstManager.name, email: firstManager.email };
    }
    if (!tl) {
      tl = { name: "Team Lead", email: "unassigned@minierp.local" };
    }

    // Find existing worklog for today or create one
    let worklog = await prisma.workLog.findFirst({
      where: { userId, date: todayStr },
      include: { logItems: true },
    });

    if (!worklog) {
      const logId = "wl_" + Math.random().toString(36).substr(2, 9);
      worklog = await prisma.workLog.create({
        data: {
          id: logId,
          userId,
          date: todayStr,
          emailDraft: "",
          emailSubject: `Daily Work Report - ${member.name} (${todayStr})`,
          aiSummarized: "",
          sentToTl: false,
          tlName: tl.name,
          tlEmail: tl.email,
          submittedAt: new Date().toISOString(),
        },
        include: { logItems: true },
      });
    }

    // Append the new item
    const itemId = `wli_${worklog.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    await prisma.workLogItem.create({
      data: {
        id: itemId,
        workLogId: worklog.id,
        project: item.project,
        category: item.category,
        description: item.description,
        hoursSpent: Number(item.hoursSpent),
        githubLink: item.githubLink || null,
        taskId: item.taskId || null,
      },
    });

    // Rebuild email draft with all items now
    const allItems = await prisma.workLogItem.findMany({ where: { workLogId: worklog.id } });
    const refreshedDraft = this.buildEmailDraft(member.name, worklog.tlName || tl.name, todayStr, allItems);
    await prisma.workLog.update({
      where: { id: worklog.id },
      data: {
        emailDraft: refreshedDraft,
        emailSubject: `Daily Work Report - ${member.name} (${todayStr})`,
        sentToTl: false,
      },
    });

    await this.recalculateAllTaskActualHours();

    return prisma.workLog.findUnique({
      where: { id: worklog.id },
      include: { logItems: true },
    });
  }

  static async deleteWorkLogItem(worklogId: string, itemId: string) {
    const worklog = await prisma.workLog.findUnique({
      where: { id: worklogId },
      include: {
        member: true,
        logItems: true,
      },
    });

    if (!worklog) {
      throw new Error("Work log not found.");
    }

    const targetItem = worklog.logItems.find(item => item.id === itemId);
    if (!targetItem) {
      throw new Error("Work log item not found.");
    }

    const remainingItems = worklog.logItems
      .filter(item => item.id !== itemId)
      .map(item => ({
        id: item.id,
        project: item.project,
        category: item.category,
        description: item.description,
        hoursSpent: item.hoursSpent,
        taskId: item.taskId,
      }));

    await prisma.$transaction(async tx => {
      await tx.workLogItem.delete({ where: { id: itemId } });

      if (remainingItems.length === 0) {
        await tx.workLog.delete({ where: { id: worklogId } });
        return;
      }

      const leadName = worklog.tlName || "Team Lead";
      const refreshedDraft = this.buildEmailDraft(worklog.member.name, leadName, worklog.date, remainingItems);
      await tx.workLog.update({
        where: { id: worklogId },
        data: {
          emailDraft: refreshedDraft,
          emailSubject: `Daily Work Report - ${worklog.member.name} (${worklog.date})`,
          sentToTl: false,
        },
      });
    });

    await this.recalculateAllTaskActualHours();

    return prisma.workLog.findMany({
      where: {
        userId: worklog.userId,
        date: worklog.date,
      },
      include: {
        logItems: true,
      },
    });
  }

  static async recalculateAllTaskActualHours() {
    // 1. Reset all tasks' actual hours to 0
    await prisma.task.updateMany({
      data: {
        actualHours: 0,
      },
    });

    // 2. Query all worklog items that are linked to a task
    const items = await prisma.workLogItem.findMany({
      where: {
        taskId: {
          not: null,
        },
      },
    });

    // 3. Accumulate hoursSpent per taskId
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.taskId) {
        map.set(item.taskId, (map.get(item.taskId) || 0) + item.hoursSpent);
      }
    }

    // 4. Update each task with the sum
    for (const [taskId, value] of map.entries()) {
      try {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            actualHours: value,
          },
        });
      } catch (err) {
        // Safe check for tasks that might have been deleted but are reference in logs
        console.warn(`Could not update actualHours for deleted or missing taskId: ${taskId}`, err);
      }
    }
  }
}
