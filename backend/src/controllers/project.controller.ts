import type { Request, Response } from "express";
import { ProjectService } from "../services/project.service.js";

export const getProjects = async (_req: Request, res: Response) => {
  try {
    const projects = await ProjectService.getAllProjects();
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};