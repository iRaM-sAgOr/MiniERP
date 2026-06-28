import type { Request, Response } from "express";
import sharp from "sharp";
import { getRequestUserId } from "../middleware/auth.middleware.js";
import { getOnlineUsers } from "../realtime/chat.gateway.js";
import { ErpService } from "../services/erp.service.js";
import { uploadAvatarToSupabase } from "../services/avatar-storage.service.js";
import { MemberRepository } from "../repositories/member.repository.js";
import { MemberService } from "../services/member.service.js";
import { MessageService } from "../services/message.service.js";
import { SentEmailService } from "../services/sent-email.service.js";
import { TaskService } from "../services/task.service.js";
import { WorkLogService } from "../services/worklog.service.js";
const MIN_AVATAR_DIMENSION = 128;
const MAX_AVATAR_DIMENSION = 2048;

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

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const requesterId = getRequestUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "JWT token is required." });
    }
    const { taskId } = req.body;
    if (!taskId) {
      return res.status(400).json({ error: "taskId is required." });
    }
    const state = await ErpService.deleteTask(taskId, requesterId);
    res.json({ state });
  } catch (err: any) {
    const status = err.message === "Task not found." ? 404
      : err.message.includes("only delete") ? 403 : 400;
    res.status(status).json({ error: err.message });
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

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { projectId, updatedBy, ...details } = req.body;
    const state = await ErpService.updateProject(projectId, details, updatedBy, getRequestUserId(req));
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
    const parsedUserId = typeof userId === "string" ? userId.trim() : "";
    if (!parsedUserId) {
      return res.status(400).json({ error: "userId is required." });
    }

    if (req.file) {
      const metadata = await sharp(req.file.buffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const isResolutionValid =
        width >= MIN_AVATAR_DIMENSION &&
        height >= MIN_AVATAR_DIMENSION &&
        width <= MAX_AVATAR_DIMENSION &&
        height <= MAX_AVATAR_DIMENSION;

      if (!isResolutionValid) {
        return res.status(400).json({
          error: `Profile image resolution must be between ${MIN_AVATAR_DIMENSION}x${MIN_AVATAR_DIMENSION} and ${MAX_AVATAR_DIMENSION}x${MAX_AVATAR_DIMENSION}.`,
        });
      }

      const targetMime = req.file.mimetype === "image/png" ? "image/png" : "image/jpeg";
      const normalizedBuffer = targetMime === "image/png"
        ? await sharp(req.file.buffer).png({ compressionLevel: 9 }).toBuffer()
        : await sharp(req.file.buffer).jpeg({ quality: 88 }).toBuffer();

      // Fetch the current avatar URL so the old file can be deleted from Supabase.
      const existingMember = await MemberRepository.findById(parsedUserId);
      const oldAvatarUrl = existingMember?.avatar ?? null;

      profileData.avatar = await uploadAvatarToSupabase({
        userId: parsedUserId,
        buffer: normalizedBuffer,
        mimeType: targetMime,
        oldAvatarUrl,
      });
    }

    const result = await ErpService.updateProfile(parsedUserId, profileData, getRequestUserId(req));
    res.json(result);
  } catch (err: any) {
    const message = err?.message || "Profile update failed.";
    const status = message === "You can update only your own profile."
      ? 403
      : (message.includes("Supabase") ? 500 : 400);
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

export const getMessageContacts = async (req: Request, res: Response) => {
  try {
    const requesterId = getRequestUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "JWT token is required." });
    }

    const contacts = await MessageService.getMessageContacts(requesterId);
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

    const messages = await MessageService.getConversationMessages(requesterId, contactId);
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getOnlineMessageUsers = async (req: Request, res: Response) => {
  try {
    const requesterId = getRequestUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: "JWT token is required." });
    }

    const users = getOnlineUsers().filter((user) => user.userId !== requesterId);
    res.json({ users });
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

    const payload = await SentEmailService.getSentEmailLogPage(requesterId, dayPage, dayWindow);
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
