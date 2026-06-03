import type { Request, Response } from "express";
import { getRequestUserId } from "../middleware/auth.middleware.js";
import { WorkLogService } from "../services/worklog.service.js";

export const getWorkLogs = async (req: Request, res: Response) => {
  try {
    const worklogs = await WorkLogService.getVisibleWorkLogs(getRequestUserId(req));
    res.json({ worklogs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};