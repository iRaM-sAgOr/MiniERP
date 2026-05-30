import { ProjectRepository } from "../repositories/project.repository.js";
import { MemberRepository } from "../repositories/member.repository.js";

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

  static async deleteProject(projectId: string, deletedBy: string) {
    const actor = await MemberRepository.findById(deletedBy);
    if (!actor) {
      throw new Error("Deleting user was not found.");
    }

    if (actor.roleType !== "Manager") {
      throw new Error("Only managers can delete projects.");
    }

    const project = await ProjectRepository.findById(projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    return ProjectRepository.delete(projectId);
  }
}
