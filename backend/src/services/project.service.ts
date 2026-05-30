import { ProjectRepository } from "../repositories/project.repository.js";

export class ProjectService {
  static async getAllProjects() {
    return ProjectRepository.findAll();
  }

  static async createProject(name: string, description: string, createdBy: string) {
    const existing = await ProjectRepository.findAll();
    const duplicated = existing.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    
    if (duplicated) {
      throw new Error("A project with this name already exists in the system.");
    }

    const projectId = "p_" + Math.random().toString(36).substr(2, 9);
    
    return ProjectRepository.create({
      id: projectId,
      name,
      description: description || "",
      createdAt: new Date().toISOString(),
      createdBy,
    });
  }
}
