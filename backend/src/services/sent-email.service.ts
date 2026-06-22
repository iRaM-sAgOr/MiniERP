import { MemberRepository } from "../repositories/member.repository.js";
import { SentEmailRepository } from "../repositories/sent-email.repository.js";
import { WorkLogRepository } from "../repositories/worklog.repository.js";

export class SentEmailService {
  static toDayKey(iso: string) {
    if (!iso) return "";
    return iso.split("T")[0] || "";
  }

  static async sendEmail(
    worklogId: string | undefined,
    customSubject: string,
    customBody: string,
    recipientId: string | undefined,
    requesterId?: string | null
  ) {
    const worklog = worklogId ? await WorkLogRepository.findById(worklogId) : null;
    if (worklogId && !worklog) {
      throw new Error("Work log not found.");
    }

    const dispatchSubject = (customSubject || worklog?.emailSubject || `Daily Work Report${worklog ? ` - ${worklog.date}` : ""}`).trim();
    const dispatchBody = (customBody || worklog?.emailDraft || "").trim();
    const isAllRecipients = recipientId === "ALL";
    const selectedRecipient = !isAllRecipients && recipientId ? await MemberRepository.findById(recipientId) : null;

    if (!isAllRecipients && recipientId && !selectedRecipient) {
      throw new Error("Recipient not found.");
    }

    const receiverName = isAllRecipients ? "All Members" : (selectedRecipient?.name || "Selected User");
    const receiverEmail = isAllRecipients ? "all@minierp.local" : (selectedRecipient?.email || "selected.user@minierp.local");

    if (worklog) {
      await WorkLogRepository.updateDispatch(worklog.id, dispatchSubject, dispatchBody);
    }

    await SentEmailRepository.create({
      id: "email_" + Math.random().toString(36).substr(2, 9),
      senderId: worklog?.userId || requesterId || "system",
      subject: dispatchSubject,
      receiverName,
      receiverEmail,
      body: dispatchBody,
      timestamp: new Date().toISOString(),
    });

    return { senderId: worklog?.userId || requesterId || null };
  }

  static async getVisibleSentEmailLogs(requesterId: string) {
    const requester = await MemberRepository.findRequesterById(requesterId);
    if (!requester) {
      return { logs: [], requester: null };
    }

    const isManager = (requester.roleType || "").toLowerCase() === "manager";
    const sentEmailsLog = await SentEmailRepository.findAll();

    const logs = isManager
      ? sentEmailsLog
      : sentEmailsLog.filter(
          log => log.senderId === requesterId || log.receiverEmail === requester.email || log.receiverEmail === "all@minierp.local"
        );

    return { logs, requester };
  }

  static async getSentEmailLogPage(requesterId: string, dayPage: number, dayWindow: number) {
    const { logs, requester } = await this.getVisibleSentEmailLogs(requesterId);
    const grouped = new Map<string, any[]>();

    for (const item of logs) {
      const day = this.toDayKey(item.timestamp);
      if (!grouped.has(day)) {
        grouped.set(day, []);
      }
      grouped.get(day)!.push(item);
    }

    const availableDays = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
    const totalDays = availableDays.length;
    const totalDayPages = Math.max(1, Math.ceil(totalDays / dayWindow));
    const boundedPage = Math.min(dayPage, totalDayPages);
    const startIdx = (boundedPage - 1) * dayWindow;
    const days = availableDays.slice(startIdx, startIdx + dayWindow);

    const dayBuckets = days.map((day) => ({
      day,
      items: (grouped.get(day) || []).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    }));

    return {
      scope: requester?.roleType || "Engineer",
      dayBuckets,
      pagination: {
        dayPage: boundedPage,
        dayWindow,
        totalDays,
        totalDayPages,
        hasNext: boundedPage < totalDayPages,
        hasPrev: boundedPage > 1,
      },
    };
  }
}
