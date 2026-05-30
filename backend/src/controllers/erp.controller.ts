import type { Request, Response } from "express";
import { getRequestUserId } from "../middleware/auth.middleware.js";
import { ErpService } from "../services/erp.service.js";

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

export const worklog = async (req: Request, res: Response) => {
  try {
    const { userId, items, assignedTL } = req.body;
    const state = await ErpService.worklog(userId, items, assignedTL, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { senderId, receiverId, text } = req.body;
    const state = await ErpService.sendMessage(senderId, receiverId, text, getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const resetDatabase = async (req: Request, res: Response) => {
  try {
    const state = await ErpService.reset(getRequestUserId(req));
    res.json({ state });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
