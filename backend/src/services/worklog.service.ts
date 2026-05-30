import { WorkLogRepository } from "../repositories/worklog.repository.js";
import { MemberRepository } from "../repositories/member.repository.js";
import { TaskRepository } from "../repositories/task.repository.js";
import { getGeminiAI } from "../config/gemini.js";
import { prisma } from "../config/prisma.js";

export class WorkLogService {
  static async getAllWorkLogs() {
    return WorkLogRepository.findAll();
  }

  static async getWorkLogsByUserId(userId: string) {
    return WorkLogRepository.findByUserId(userId);
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
    const tl = assignedTL || { name: "Sarah Connor", email: "sarah.connor@monolith.io" };

    const itemsText = items.map((it, idx) => {
      return `${idx + 1}. [Project: ${it.project}] (${it.category}) ${it.description} - spent ${it.hoursSpent} hours.`;
    }).join("\n");

    let emailDraft = "";
    let emailSubject = `Daily Work Report - ${member.name} (${todayStr})`;
    let aiSummarized = "";

    const ai = getGeminiAI();

    if (ai && items.length > 0) {
      try {
        const prompt = `
You are an advanced remote Team Lead assistant. Below is the raw daily activities log submitted by remote employee ${member.name} (${member.role}):

${itemsText}

Using these raw logs, please generate two things and format them in a tidy JSON block:
1. "summary": A brief 1-sentence professional summary summarizing what the engineer achieved today. Focus on outcomes.
2. "emailBody": A polite, incredibly professional, well-structured daily update email directed to their supervisor ${tl.name}. Include a pleasant opening, absolute exact breakdown of the tasks and hours in neat bullet points, and a friendly, respectful sign-off.

Format your response as a strict JSON block, with these exact keys:
{
  "summary": "their summary here",
  "emailBody": "professional email draft body here"
}
Ensure there is no extra fluff or markdown outside of the JSON block. Do NOT include json tags, just the raw JSON.
`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        const responseText = response.text || "{}";
        const cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

        try {
          const parsed = JSON.parse(cleanedText);
          aiSummarized = parsed.summary || "";
          emailDraft = parsed.emailBody || "";
        } catch (err) {
          console.error("JSON formatting error for Gemini reply:", responseText, err);
          aiSummarized = `Completed engineering entries under projects: ${items.map(i => i.project).join(", ")}.`;
          emailDraft = `Dear ${tl.name},\n\nHope this finds you well. Here is my daily remote activity log for today:\n\n${items.map(it => `- ${it.project} [${it.category}]: ${it.description} (${it.hoursSpent}h)`).join('\n')}\n\nThank you,\n${member.name}`;
        }
      } catch (aiErr) {
        console.error("Gemini server conversation crashed:", aiErr);
        aiSummarized = `Drafted updates for: ${items.map(i => i.project).join(", ")}.`;
        emailDraft = `Hi ${tl.name},\n\nHere is my work summary for today:\n\n${items.map(it => `- ${it.project} (${it.category}): ${it.description} (${it.hoursSpent}h)`).join('\n')}\n\nBest regards,\n${member.name}`;
      }
    } else {
      aiSummarized = `Documented ${items.length} tasks across team logs.`;
      emailDraft = `Dear ${tl.name},\n\nI have successfully completed my hours today. Raw tasks completed:\n\n${items.map(it => `- ${it.project} - ${it.description} (${it.hoursSpent} hrs)`).join('\n')}\n\nSincerely,\n${member.name}`;
    }

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
