import { ProjectRepository } from "../repositories/project.repository.js";
import { MemberRepository } from "../repositories/member.repository.js";

type ProjectMetadataPayload = {
  name?: string;
  description?: string;
  githubRepoUrl?: string;
  notionUrl?: string;
  milestonePlan?: string;
  standardChecklist?: string;
  releasePlanUrl?: string;
  status?: "Planning" | "Active" | "Blocked" | "Completed" | "Inactive";
};

export class ProjectService {
  private static normalizeOptional(value?: string) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private static validateOptionalUrl(value: string | null | undefined, fieldName: string) {
    if (!value) return;
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      throw new Error(`${fieldName} must be a valid http/https URL.`);
    }
  }

  static async getAllProjects(options?: { includeInactive?: boolean }) {
    return ProjectRepository.findAll(options);
  }

  static async createProject(name: string, description: string, createdBy: string) {
    const existing = await ProjectRepository.findAll({ includeInactive: true });
    const duplicated = existing.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    
    if (duplicated) {
      throw new Error("A project with this name already exists in the system.");
    }

    const projectId = "p_" + Math.random().toString(36).substr(2, 9);
    
    return ProjectRepository.create({
      id: projectId,
      name,
      description: description || "",
      githubRepoUrl: null,
      notionUrl: null,
      milestonePlan: null,
      standardChecklist: null,
      releasePlanUrl: null,
      status: "Planning",
      createdAt: new Date().toISOString(),
      updatedAt: null,
      createdBy,
    });
  }

  static async updateProjectDetails(projectId: string, updatedBy: string, payload: ProjectMetadataPayload) {
    const actor = await MemberRepository.findById(updatedBy);
    if (!actor) {
      throw new Error("Updating user was not found.");
    }

    if (actor.roleType !== "Manager") {
      throw new Error("Only managers can update project details.");
    }

    const project = await ProjectRepository.findById(projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    const allowedStatuses = new Set(["Planning", "Active", "Blocked", "Completed", "Inactive"]);
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof payload.name === "string") {
      const name = payload.name.trim();
      if (!name) throw new Error("Project name is required.");

      const existing = await ProjectRepository.findAll({ includeInactive: true });
      const duplicated = existing.some(
        p => p.id !== projectId && p.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (duplicated) {
        throw new Error("A project with this name already exists in the system.");
      }

      updates.name = name;
    }

    if (typeof payload.description === "string") {
      updates.description = this.normalizeOptional(payload.description);
    }

    if (typeof payload.status === "string") {
      if (!allowedStatuses.has(payload.status)) {
        throw new Error("Invalid project status.");
      }
      updates.status = payload.status;
    }

    if (payload.githubRepoUrl !== undefined) {
      updates.githubRepoUrl = this.normalizeOptional(payload.githubRepoUrl);
      this.validateOptionalUrl(updates.githubRepoUrl, "GitHub repository URL");
    }

    if (payload.notionUrl !== undefined) {
      updates.notionUrl = this.normalizeOptional(payload.notionUrl);
      this.validateOptionalUrl(updates.notionUrl, "Notion URL");
    }

    if (payload.releasePlanUrl !== undefined) {
      updates.releasePlanUrl = this.normalizeOptional(payload.releasePlanUrl);
      this.validateOptionalUrl(updates.releasePlanUrl, "Release plan URL");
    }

    if (payload.milestonePlan !== undefined) {
      updates.milestonePlan = this.normalizeOptional(payload.milestonePlan);
    }

    if (payload.standardChecklist !== undefined) {
      updates.standardChecklist = this.normalizeOptional(payload.standardChecklist);
    }

    return ProjectRepository.update(projectId, updates);
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

    if ((project.status || "").toLowerCase() === "inactive") {
      throw new Error("Project is already inactive.");
    }

    return ProjectRepository.softDelete(projectId);
  }
}
