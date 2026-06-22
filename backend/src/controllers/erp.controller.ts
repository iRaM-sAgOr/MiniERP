import type { Request, Response } from "express";
import { getRequestUserId } from "../middleware/auth.middleware.js";
import { ErpService } from "../services/erp.service.js";
import { MemberService } from "../services/member.service.js";
import { TaskService } from "../services/task.service.js";
import { WorkLogService } from "../services/worklog.service.js";

export const getManagerState = async (req: Request, res: Response) => {
  try {
    const state = await ErpService.getManagerState(getRequestUserId(req));
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getEngineerState = async (req: Request, res: Response) => {
  try {
    const state = await ErpService.getEngineerState(getRequestUserId(req));
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await ErpService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const result = await ErpService.register(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const punch = async (req: Request, res: Response) => {
  try {
    const { userId, type, note } = req.body;
    const state = await ErpService.punch(userId, type, note || "", getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const appendWorklogItem = async (req: Request, res: Response) => {
  try {
    const { userId, item, assignedTL } = req.body;
    const actorId = getRequestUserId(req) || userId;
    const worklog = await WorkLogService.appendItem(actorId, item, assignedTL);
    res.json({ worklog });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteWorklogItem = async (req: Request, res: Response) => {
  try {
    const { worklogId, itemId } = req.body;
    const worklogs = await WorkLogService.deleteWorkLogItem(worklogId, itemId);
    res.json({ worklogs });
  } catch (err: any) {
    const status = err.message === "Work log not found." || err.message === "Work log item not found." ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
};

export const sendEmail = async (req: Request, res: Response) => {
  try {
    const { worklogId, customSubject, customBody, recipientId } = req.body;
    const state = await ErpService.sendEmail(worklogId, customSubject, customBody, recipientId, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    const status = err.message === "Work log not found." || err.message === "Recipient not found." ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const state = await ErpService.createTask(req.body, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const requesterId = getRequestUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "JWT token is required." });
    }

    const result = await TaskService.getTaskList(requesterId, {
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 10),
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      priority: typeof req.query.priority === "string" ? (req.query.priority as any) : undefined,
      status: typeof req.query.status === "string" ? (req.query.status as any) : undefined,
      assignedTo: typeof req.query.assignedTo === "string" ? req.query.assignedTo : undefined,
      includeCompleted: req.query.includeCompleted === "true",
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { taskId, actorId, status, ...details } = req.body;
    const state = await ErpService.updateTask(taskId, actorId, status, details, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const { taskId, authorId, text } = req.body;
    const state = await ErpService.addTaskComment(taskId, authorId, text, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateTaskSubtasks = async (req: Request, res: Response) => {
  try {
    const { taskId, subtasks, actorId } = req.body;
    const state = await ErpService.updateTaskSubtasks(taskId, subtasks, actorId, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, createdBy } = req.body;
    const state = await ErpService.createProject(name, description, createdBy, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { projectId, deletedBy } = req.body;
    const state = await ErpService.deleteProject(projectId, deletedBy, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { userId, roleType } = req.body;
    const result = await ErpService.updateRole(userId, roleType, getRequestUserId(req));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { userId, ...profileData } = req.body;
    const result = await ErpService.updateProfile(userId, profileData, getRequestUserId(req));
    res.json(result);
  } catch (err: any) {
    const status = err.message === "You can update only your own profile." ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { senderId, receiverId, text } = req.body;
    const state = await ErpService.sendMessage(senderId, receiverId, text, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await MemberService.requestPasswordReset(email || "");
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    const result = await MemberService.resetPassword(email || "", token || "", newPassword || "");
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const managerGeneratePasswordReset = async (req: Request, res: Response) => {
  try {
    const requesterId = getRequestUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "JWT token is required." });
    }

    const { memberId } = req.body;
    const result = await MemberService.generatePasswordResetByManager(requesterId, memberId || "");
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

type MessageContactSummary = {
  contactId: string;
  contactName: string;
  contactAvatar: string;
  lastMessageAt: string;
  lastMessagePreview: string;
};

const toDayKey = (iso: string) => {
  if (!iso) return "";
  return iso.split("T")[0] || "";
};

export const getMessageContacts = async (req: Request, res: Response) => {
  try {
    const requesterId = getRequestUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "JWT token is required." });
    }

    const messages = await ErpService.getVisibleMessagesForRequester(requesterId);
    const contactsMap = new Map<string, MessageContactSummary>();

    for (const message of messages) {
      const isSender = message.senderId === requesterId;
      const contactId = isSender ? message.receiverId : message.senderId;
      if (!contactId) {
        continue;
      }

      const contactName = isSender ? (message.receiverName || "Unknown") : (message.senderName || "Unknown");
      const contactAvatar = isSender ? (message.receiverAvatar || "") : (message.senderAvatar || "");
      const content = (message.text || message.content || "").trim();
      const current = contactsMap.get(contactId);

      if (!current || current.lastMessageAt < message.timestamp) {
        contactsMap.set(contactId, {
          contactId,
          contactName,
          contactAvatar,
          lastMessageAt: message.timestamp,
          lastMessagePreview: content,
        });
      }
    }

    const contacts = Array.from(contactsMap.values()).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    res.json({ contacts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getConversationMessages = async (req: Request, res: Response) => {
  try {
    const requesterId = getRequestUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "JWT token is required." });
    }

    const contactId = String(req.query.contactId || "").trim();
    if (!contactId) {
      return res.status(400).json({ error: "contactId query parameter is required." });
    }

    const messages = await ErpService.getConversationMessages(requesterId, contactId);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSentEmailLogs = async (req: Request, res: Response) => {
  try {
    const requesterId = getRequestUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "JWT token is required." });
    }

    const dayPage = Math.max(1, Number(req.query.dayPage || 1));
    const dayWindow = Math.min(30, Math.max(1, Number(req.query.dayWindow || 5)));

    const { logs, requester } = await ErpService.getVisibleSentEmailLogs(requesterId);
    const grouped = new Map<string, any[]>();

    for (const item of logs) {
      const day = toDayKey(item.timestamp);
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

    res.json({
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
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
