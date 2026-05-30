import bcryptjs from "bcryptjs";
import { createAuthToken, getRequestUserId, sanitizeMember, type AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { ErpRepository } from "../repositories/erp.repository.js";
import { MemberService } from "./member.service.js";
import { PunchService } from "./punch.service.js";
import { WorkLogService } from "./worklog.service.js";
import { TaskService } from "./task.service.js";
import { ProjectService } from "./project.service.js";
import { MessageService } from "./message.service.js";
import { emitDirectMessage } from "../realtime/chat.gateway.js";

type StateMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleType: string;
  avatar: string;
  department: string;
  punchStatus: string;
  lastPunchTime: string | null;
  isTL: boolean;
  tlId: string | null;
  agreementHours: number | null;
  breakDay: string | null;
};

async function getFullState(requesterId?: string | null) {
  const requester = requesterId ? await ErpRepository.findRequesterById(requesterId) : null;
  const isManager = requester?.roleType === "Manager";

  const [members, punches, worklogs, tasks, messages, projects, sentEmailsLog] = await Promise.all([
    ErpRepository.findStateMembers(),
    ErpRepository.findPunches(),
    ErpRepository.findWorkLogs(),
    ErpRepository.findTasks(),
    ErpRepository.findMessages(),
    ErpRepository.findProjects(),
    ErpRepository.findSentEmails(),
  ]);

  const safeMembers = members as StateMember[];
  const requesterExists = Boolean(requester);
  const scopedMembers = requesterExists ? safeMembers : [];
  const scopedPunches = requesterExists ? (isManager ? punches : punches.filter(punch => punch.userId === requesterId)) : [];
  const scopedWorklogs = requesterExists ? (isManager ? worklogs : worklogs.filter(worklog => worklog.userId === requesterId)) : [];
  const scopedTasks = requesterExists ? (isManager ? tasks : tasks.filter(task => task.assignedTo === requesterId)) : [];
  const scopedMessages = requesterExists
    ? (isManager ? messages : messages.filter(message => message.channel === "general" || message.senderId === requesterId || message.receiverId === requesterId))
    : [];
  const scopedProjects = requesterExists ? projects : [];
  const scopedSentEmailsLog = requesterExists ? (isManager ? sentEmailsLog : sentEmailsLog.filter(log => log.senderId === requesterId)) : [];

  const mappedWorklogs = scopedWorklogs.map(wl => ({
    ...wl,
    items: wl.logItems,
    assignedTL: { name: wl.tlName || "", email: wl.tlEmail || "" },
  }));

  const mappedMessages = scopedMessages.map(msg => ({
    ...msg,
    text: msg.text || msg.content || "",
    content: msg.content || msg.text || "",
  }));

  return {
    members: scopedMembers,
    punches: scopedPunches,
    worklogs: mappedWorklogs,
    tasks: scopedTasks,
    messages: mappedMessages,
    projects: scopedProjects,
    sentEmailsLog: scopedSentEmailsLog,
  };
}

export class ErpService {
  static async getState(requesterId?: string | null) {
    return getFullState(requesterId);
  }

  static async login(email: string, password: string) {
    const member = await MemberService.authenticate(email, password);
    return { member: sanitizeMember(member), token: createAuthToken(member), expiresIn: process.env.JWT_EXPIRES_IN || "8h" };
  }

  static async register(userData: any) {
    const member = await MemberService.registerMember(userData);
    const state = await getFullState(member.id);
    return { member: sanitizeMember(member), token: createAuthToken(member), state, expiresIn: process.env.JWT_EXPIRES_IN || "8h" };
  }

  static async punch(userId: string, type: "Punch" | "ClockOut" | "BreakStart" | "BreakEnd", note: string, requesterId?: string | null) {
    await PunchService.performPunch(userId, type, note || "");
    return getFullState(requesterId);
  }

  static async worklog(
    userId: string,
    items: Array<{ project: string; category: string; description: string; hoursSpent: number; taskId?: string }>,
    assignedTL: { name: string; email: string } | undefined,
    requesterId?: string | null
  ) {
    await WorkLogService.createOrReplaceWorkLog(userId, items, assignedTL);
    return getFullState(requesterId);
  }

  static async sendEmail(worklogId: string, customSubject: string, customBody: string, recipientId: string | undefined, requesterId?: string | null) {
    const worklog = await ErpRepository.findWorkLogById(worklogId);
    if (!worklog) {
      throw new Error("Work log not found.");
    }

    const dispatchSubject = (customSubject || worklog.emailSubject || `Daily Work Report - ${worklog.date}`).trim();
    const dispatchBody = (customBody || worklog.emailDraft || "").trim();
    const isAllRecipients = recipientId === "ALL";
    const selectedRecipient = !isAllRecipients && recipientId ? await ErpRepository.findMemberById(recipientId) : null;

    if (!isAllRecipients && recipientId && !selectedRecipient) {
      throw new Error("Recipient not found.");
    }

    const receiverName = isAllRecipients ? "All Members" : (selectedRecipient?.name || "Selected User");
    const receiverEmail = isAllRecipients ? "all@minierp.local" : (selectedRecipient?.email || "selected.user@minierp.local");

    await ErpRepository.updateWorkLogDispatch(worklogId, dispatchSubject, dispatchBody);
    await ErpRepository.createSentEmailLog({
      id: "email_" + Math.random().toString(36).substr(2, 9),
      senderId: worklog.userId,
      subject: dispatchSubject,
      receiverName,
      receiverEmail,
      body: dispatchBody,
      timestamp: new Date().toISOString(),
    });

    return getFullState(requesterId);
  }

  static async createTask(taskData: any, requesterId?: string | null) {
    await TaskService.createTask(taskData);
    return getFullState(requesterId);
  }

  static async updateTask(taskId: string, actorId: string, status: string | undefined, details: Record<string, any>, requesterId?: string | null) {
    const actor = await ErpRepository.findMemberById(actorId);
    const actorName = actor ? actor.name : "System";

    if (status !== undefined && Object.keys(details).length === 0) {
      await TaskService.updateStatus(taskId, actorId, actorName, status);
    } else {
      const updatePayload = { ...details };
      if (status !== undefined) {
        updatePayload.status = status;
      }
      await TaskService.updateTaskDetails(taskId, actorId, actorName, updatePayload);
    }

    return getFullState(requesterId);
  }

  static async addTaskComment(taskId: string, authorId: string, text: string, requesterId?: string | null) {
    const author = await ErpRepository.findMemberById(authorId);
    const authorName = author ? author.name : "Anonymous";
    const authorAvatar = author ? author.avatar : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";

    await TaskService.addComment(taskId, authorId, authorName, authorAvatar, text);
    return getFullState(requesterId);
  }

  static async updateTaskSubtasks(taskId: string, subtasks: Array<{ id: string; title: string; isCompleted: boolean }>, actorId: string, requesterId?: string | null) {
    const actor = await ErpRepository.findMemberById(actorId);
    const actorName = actor ? actor.name : "System";

    await TaskService.updateSubtasks(taskId, actorId, actorName, subtasks);
    return getFullState(requesterId);
  }

  static async createProject(name: string, description: string, createdBy: string, requesterId?: string | null) {
    await ProjectService.createProject(name, description, createdBy);
    return getFullState(requesterId);
  }

  static async deleteProject(projectId: string, deletedBy: string, requesterId?: string | null) {
    await ProjectService.deleteProject(projectId, deletedBy);
    return getFullState(requesterId);
  }

  static async updateRole(userId: string, roleType: string, requesterId?: string | null) {
    const member = await MemberService.updateRoleType(userId, roleType);
    const state = await getFullState(requesterId);
    return { member: sanitizeMember(member), state };
  }

  static async sendMessage(senderId: string, receiverId: string, text: string, requesterId?: string | null) {
    const message = await MessageService.createDirectMessage(senderId, receiverId, text);
    emitDirectMessage(message);
    return getFullState(requesterId);
  }

  static async reset(requesterId?: string | null) {
    await ErpRepository.deleteAllState();

    const testPasswordHash = bcryptjs.hashSync("password123", 10);

    await ErpRepository.createMembers([
      {
        id: "user-sagor",
        name: "Ikramul Haq Sagor",
        email: "ikramulhaqsagor@gmail.com",
        passwordHash: testPasswordHash,
        role: "Senior Full Stack Engineer",
        roleType: "Engineer",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        department: "Engineering",
        punchStatus: "Offline",
        isTL: false,
        tlId: "lead-sarah",
        agreementHours: 20,
        breakDay: "Friday",
      },
      {
        id: "lead-sarah",
        name: "Sarah Connor",
        email: "sarah.connor@monolith.io",
        passwordHash: testPasswordHash,
        role: "Engineering Team Lead",
        roleType: "Manager",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
        department: "Engineering",
        punchStatus: "Active",
        lastPunchTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
        isTL: true,
        tlId: null,
        agreementHours: 40,
        breakDay: "Sunday",
      },
      {
        id: "user-alex",
        name: "Alex Rivera",
        email: "alex.rivera@monolith.io",
        passwordHash: testPasswordHash,
        role: "Lead UI/UX Designer",
        roleType: "Engineer",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        department: "Design",
        punchStatus: "Break",
        lastPunchTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isTL: false,
        tlId: "lead-sarah",
        agreementHours: 10,
        breakDay: "Monday",
      },
      {
        id: "user-maya",
        name: "Maya Peterson",
        email: "maya.p@monolith.io",
        passwordHash: testPasswordHash,
        role: "Principal Product Manager",
        roleType: "Manager",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
        department: "Product",
        punchStatus: "Offline",
        isTL: true,
        tlId: null,
        agreementHours: 40,
        breakDay: "Saturday",
      },
      {
        id: "user-liam",
        name: "Liam Foster",
        email: "liam.f@monolith.io",
        passwordHash: testPasswordHash,
        role: "Senior Cloud & DevOps Architect",
        roleType: "Engineer",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
        department: "Engineering",
        punchStatus: "ClockedOut",
        lastPunchTime: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        isTL: false,
        tlId: "lead-sarah",
        agreementHours: 20,
        breakDay: "Friday",
      },
    ]);

    await ErpRepository.createProjects([
      { id: "p1", name: "Monolith Core", description: "Backend optimization layers & API platform", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
      { id: "p2", name: "DevOps Infrastructure", description: "Azure deployment cluster mapping and pipeline caching", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
      { id: "p3", name: "Swiss Design System", description: "Elegant layout, high contrast dashboard components", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
    ]);

    return getFullState(requesterId);
  }
}