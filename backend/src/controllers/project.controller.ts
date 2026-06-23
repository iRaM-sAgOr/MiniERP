import type { Request, Response } from "express";
import { ProjectService } from "../services/project.service.js";

export const getProjects = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const projects = await ProjectService.getAllProjects({ includeInactive });
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};