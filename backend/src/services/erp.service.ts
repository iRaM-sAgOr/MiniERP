import { createAuthToken, sanitizeMember } from "../middleware/auth.middleware.js";
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

type CommonState = {
  members: StateMember[];
  punches: any[];
  worklogs: any[];
  tasks: any[];
  messages: any[];
  projects: any[];
  sentEmailsLog: any[];
};

const buildCommonState = async (requesterId?: string | null): Promise<CommonState> => {
  const requester = requesterId ? await ErpRepository.findRequesterById(requesterId) : null;
  const isManager = (requester?.roleType || "").toLowerCase() === "manager";

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
    ? messages.filter(message => message.channel === "general" || message.senderId === requesterId || message.receiverId === requesterId)
    : [];
  const scopedProjects = requesterExists ? projects : [];
  const scopedSentEmailsLog = requesterExists
    ? sentEmailsLog.filter(log => log.senderId === requesterId || log.receiverEmail === requester?.email || log.receiverEmail === "all@minierp.local")
    : [];

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
};

const buildManagerState = async (requesterId?: string | null) => {
  const commonState = await buildCommonState(requesterId);
  const todayStr = new Date().toISOString().split("T")[0];

  return {
    ...commonState,
    scope: "manager",
    dashboard: {
      totalMembers: commonState.members.length,
      activeMembers: commonState.members.filter(member => member.punchStatus === "Active").length,
      breakMembers: commonState.members.filter(member => member.punchStatus === "Break").length,
      openTasks: commonState.tasks.filter(task => task.status !== "Completed").length,
      todayWorklogs: commonState.worklogs.filter(worklog => worklog.date === todayStr).length,
      sentEmailsToday: commonState.sentEmailsLog.filter(log => log.timestamp.startsWith(todayStr)).length,
    },
  };
};

const buildEngineerState = async (requesterId?: string | null) => {
  const commonState = await buildCommonState(requesterId);
  const allTasks = await ErpRepository.findTasks();
  const todayStr = new Date().toISOString().split("T")[0];
  const myMember = commonState.members.find(member => member.id === requesterId) || null;
  const myWorklogs = commonState.worklogs.filter(worklog => worklog.userId === requesterId);
  const myTasks = allTasks.filter(task => task.assignedTo === requesterId);
  const otherTasks = allTasks.filter(task => task.assignedTo !== requesterId);
  const myPunches = commonState.punches.filter(punch => punch.userId === requesterId);
  const myMessages = commonState.messages.filter(
    message => message.channel === "general" || message.senderId === requesterId || message.receiverId === requesterId
  );

  const relatedMemberIds = new Set<string>(requesterId ? [requesterId] : []);
  if (myMember?.tlId) {
    relatedMemberIds.add(myMember.tlId);
  }

  for (const task of allTasks) {
    if (task.assignedBy) {
      relatedMemberIds.add(task.assignedBy);
    }
    for (const comment of task.comments || []) {
      if (comment.authorId) {
        relatedMemberIds.add(comment.authorId);
      }
    }
  }

  for (const message of myMessages) {
    if (message.senderId) {
      relatedMemberIds.add(message.senderId);
    }
    if (message.receiverId) {
      relatedMemberIds.add(message.receiverId);
    }
  }

  const relatedMembers = commonState.members.filter(member => relatedMemberIds.has(member.id));

  const relatedProjectNames = new Set<string>();
  for (const task of allTasks) {
    if (task.projectName) {
      relatedProjectNames.add(task.projectName);
    }
  }
  for (const worklog of myWorklogs) {
    for (const item of worklog.items || []) {
      if (item.project) {
        relatedProjectNames.add(item.project);
      }
    }
  }

  const relatedProjects = commonState.projects.filter(project => relatedProjectNames.has(project.name));

  const myEmailLogs = commonState.sentEmailsLog.filter(log => {
    const myEmail = myMember?.email;
    return log.senderId === requesterId || (myEmail ? log.receiverEmail === myEmail : false) || log.receiverEmail === "all@minierp.local";
  });

  const last30DaysCutoff = new Date();
  last30DaysCutoff.setDate(last30DaysCutoff.getDate() - 30);

  const dailyHoursMap = new Map<string, number>();
  for (const worklog of myWorklogs) {
    if (!worklog.date) continue;
    const workDate = new Date(`${worklog.date}T00:00:00.000Z`);
    if (workDate < last30DaysCutoff) continue;

    const dayHours = (worklog.items || []).reduce((sum: number, item: any) => sum + (Number(item.hoursSpent) || 0), 0);
    dailyHoursMap.set(worklog.date, (dailyHoursMap.get(worklog.date) || 0) + dayHours);
  }

  const recentDailyHours = Array.from(dailyHoursMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, hours]) => ({ date, hours: Number(hours.toFixed(2)) }));

  const totalHoursLast30Days = recentDailyHours.reduce((sum, item) => sum + item.hours, 0);
  const todayWorkedHours = recentDailyHours.find(item => item.date === todayStr)?.hours || 0;

  return {
    ...commonState,
    scope: "engineer",
    member: myMember,
    members: relatedMembers,
    messages: myMessages,
    projects: commonState.projects,
    sentEmailsLog: myEmailLogs,
    dashboard: {
      myTasks: myTasks.length,
      otherTasks: otherTasks.length,
      pendingTasks: myTasks.filter(task => task.status !== "Completed").length,
      myWorklogs: myWorklogs.length,
      myPunchesToday: myPunches.filter(punch => punch.date === todayStr).length,
      accessibleMessages: myMessages.length,
      todayWorkedHours,
      totalHoursLast30Days: Number(totalHoursLast30Days.toFixed(2)),
      recentDailyHours,
    },
    punches: myPunches,
    worklogs: myWorklogs,
    tasks: [...myTasks, ...otherTasks],
    myTasks,
    otherTasks,
  };
};

const buildStateForRequester = async (requesterId?: string | null) => {
  const requester = requesterId ? await ErpRepository.findRequesterById(requesterId) : null;
  if ((requester?.roleType || "").toLowerCase() === "manager") {
    return buildManagerState(requesterId);
  }

  return buildEngineerState(requesterId);
};

export class ErpService {
  static async getManagerState(requesterId?: string | null) {
    return buildManagerState(requesterId);
  }

  static async getEngineerState(requesterId?: string | null) {
    return buildEngineerState(requesterId);
  }

  static async getState(requesterId?: string | null) {
    return buildStateForRequester(requesterId);
  }

  static async login(email: string, password: string) {
    const member = await MemberService.authenticate(email, password);
    const state = (member.roleType || "").toLowerCase() === "manager" ? await buildManagerState(member.id) : await buildEngineerState(member.id);
    return { member: sanitizeMember(member), token: createAuthToken(member), state, expiresIn: process.env.JWT_EXPIRES_IN || "8h" };
  }

  static async register(userData: any) {
    const member = await MemberService.registerMember(userData);
    const state = (member.roleType || "").toLowerCase() === "manager" ? await buildManagerState(member.id) : await buildEngineerState(member.id);
    return { member: sanitizeMember(member), token: createAuthToken(member), state, expiresIn: process.env.JWT_EXPIRES_IN || "8h" };
  }

  static async punch(userId: string, type: "Punch" | "ClockOut" | "BreakStart" | "BreakEnd", note: string, requesterId?: string | null) {
    const actorId = requesterId || userId;
    await PunchService.performPunch(actorId, type, note || "");
    return buildStateForRequester(requesterId || actorId);
  }

  static async worklog(
    userId: string,
    items: Array<{ project: string; category: string; description: string; hoursSpent: number; taskId?: string }>,
    assignedTL: { name: string; email: string } | undefined,
    requesterId?: string | null
  ) {
    const actorId = requesterId || userId;
    await WorkLogService.createOrReplaceWorkLog(actorId, items, assignedTL);
    return buildStateForRequester(requesterId || actorId);
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

    return buildStateForRequester(requesterId || worklog.userId);
  }

  static async createTask(taskData: any, requesterId?: string | null) {
    await TaskService.createTask({
      ...taskData,
      assignedBy: requesterId || taskData.assignedBy,
    });
    return buildStateForRequester(requesterId || taskData.assignedBy);
  }

  static async updateTask(taskId: string, actorId: string, status: string | undefined, details: Record<string, any>, requesterId?: string | null) {
    const actorIdFromToken = requesterId || actorId;
    const actor = await ErpRepository.findMemberById(actorIdFromToken);
    const actorName = actor ? actor.name : "System";

    if (status !== undefined && Object.keys(details).length === 0) {
      await TaskService.updateStatus(taskId, actorIdFromToken, actorName, status);
    } else {
      const updatePayload = { ...details };
      if (status !== undefined) {
        updatePayload.status = status;
      }
      await TaskService.updateTaskDetails(taskId, actorIdFromToken, actorName, updatePayload);
    }

    return buildStateForRequester(requesterId || actorIdFromToken);
  }

  static async addTaskComment(taskId: string, authorId: string, text: string, requesterId?: string | null) {
    const authorIdFromToken = requesterId || authorId;
    const author = await ErpRepository.findMemberById(authorIdFromToken);
    const authorName = author ? author.name : "Anonymous";
    const authorAvatar = author ? author.avatar : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";

    await TaskService.addComment(taskId, authorIdFromToken, authorName, authorAvatar, text);
    return buildStateForRequester(requesterId || authorIdFromToken);
  }

  static async updateTaskSubtasks(taskId: string, subtasks: Array<{ id: string; title: string; isCompleted: boolean }>, actorId: string, requesterId?: string | null) {
    const actorIdFromToken = requesterId || actorId;
    const actor = await ErpRepository.findMemberById(actorIdFromToken);
    const actorName = actor ? actor.name : "System";

    await TaskService.updateSubtasks(taskId, actorIdFromToken, actorName, subtasks);
    return buildStateForRequester(requesterId || actorIdFromToken);
  }

  static async createProject(name: string, description: string, createdBy: string, requesterId?: string | null) {
    await ProjectService.createProject(name, description, requesterId || createdBy);
    return buildManagerState(requesterId || createdBy);
  }

  static async deleteProject(projectId: string, deletedBy: string, requesterId?: string | null) {
    await ProjectService.deleteProject(projectId, requesterId || deletedBy);
    return buildManagerState(requesterId || deletedBy);
  }

  static async updateRole(userId: string, roleType: string, requesterId?: string | null) {
    const member = await MemberService.updateRoleType(userId, roleType as "Engineer" | "Manager");
    const state = await buildManagerState(requesterId || userId);
    return { member: sanitizeMember(member), state };
  }

  static async updateProfile(
    userId: string,
    profileData: {
      name?: string;
      role?: string;
      avatar?: string;
      department?: "Engineering" | "Product" | "Design" | "Marketing";
      agreementHours?: number;
      breakDay?: string;
    },
    requesterId?: string | null
  ) {
    const actorId = requesterId || userId;
    if (!actorId || actorId !== userId) {
      throw new Error("You can update only your own profile.");
    }

    const member = await MemberService.updateProfile(actorId, profileData);
    const roleType = (member.roleType || "").toLowerCase();
    const state = roleType === "manager" ? await buildManagerState(actorId) : await buildEngineerState(actorId);

    return { member: sanitizeMember(member), state };
  }

  static async sendMessage(senderId: string, receiverId: string, text: string, requesterId?: string | null) {
    const message = await MessageService.createDirectMessage(requesterId || senderId, receiverId, text);
    emitDirectMessage(message);
    return buildStateForRequester(requesterId || senderId);
  }
}
