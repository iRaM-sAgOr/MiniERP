import type { Request, Response } from "express";
import { AttendanceService } from "../services/attendance.service.js";
import { getRequestUserId } from "../middleware/auth.middleware.js";

export const getAttendance = async (req: Request, res: Response) => {
  const requesterId = getRequestUserId(req as any);
  if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

  const memberId = req.query.memberId as string | undefined;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
  // month is 0-indexed (January = 0) to match JS Date convention
  const month = req.query.month !== undefined ? parseInt(req.query.month as string, 10) : undefined;

  const data = await AttendanceService.getAttendanceData(requesterId, memberId, year, month);
  res.json(data);
};
