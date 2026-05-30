import { TaskRepository } from "../repositories/task.repository.js";

export class TaskService {
  static async getAllTasks() {
    return TaskRepository.findAll();
  }

  static async getTaskById(id: string) {
    return TaskRepository.findById(id);
  }

  static async createTask(data: {
    title: string;
    description: string;
    assignedTo: string;
    assignedBy: string;
    priority: string;
    dueDate: string;
    projectName: string;
    estimatedHours: number;
  }) {
    const taskId = "t_" + Math.random().toString(36).substr(2, 9);
    const nowStr = new Date().toISOString();

    const created = await TaskRepository.create({
      id: taskId,
      title: data.title,
      description: data.description,
      assignedTo: data.assignedTo,
      assignedBy: data.assignedBy,
      status: "Pending",
      priority: data.priority,
      dueDate: data.dueDate,
      createdAt: nowStr,
      projectName: data.projectName,
      estimatedHours: Number(data.estimatedHours) || 8,
      actualHours: 0,
      startDate: nowStr.split("T")[0],
      endDate: data.dueDate,
    });

    // Append standard creation event record
    await TaskRepository.createHistoryEvent({
      id: "hist_" + Math.random().toString(36).substr(2, 9),
      taskId,
      actorId: data.assignedBy,
      actorName: "System",
      type: "creation",
      detail: "Task configured and scheduled",
      timestamp: nowStr,
    });

    return TaskRepository.findById(taskId);
  }

  static async updateStatus(taskId: string, actorId: string, actorName: string, newStatus: string) {
    const task = await TaskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const previousStatus = task.status;
    const updated = await TaskRepository.update(taskId, { status: newStatus });

    // Logging history event record
    await TaskRepository.createHistoryEvent({
      id: "hist_" + Math.random().toString(36).substr(2, 9),
      taskId,
      actorId,
      actorName,
      type: "status_change",
      detail: `Changed status from "${previousStatus}" to "${newStatus}"`,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  static async addComment(taskId: string, authorId: string, authorName: string, authorAvatar: string, text: string) {
    const nowStr = new Date().toISOString();
    const commentId = "com_" + Math.random().toString(36).substr(2, 9);

    await TaskRepository.createComment({
      id: commentId,
      taskId,
      authorId,
      authorName,
      authorAvatar,
      text,
      createdAt: nowStr,
    });

    // Logging annotation history logs
    await TaskRepository.createHistoryEvent({
      id: "hist_" + Math.random().toString(36).substr(2, 9),
      taskId,
      actorId: authorId,
      actorName: authorName,
      type: "comment",
      detail: `Added comment notes: "${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`,
      timestamp: nowStr,
    });

    return TaskRepository.findById(taskId);
  }

  static async updateSubtasks(taskId: string, actorId: string, actorName: string, subtasks: Array<{ id: string; title: string; isCompleted: boolean }>) {
    const current = await TaskRepository.findById(taskId);
    if (!current) {
      throw new Error("Task not found to synchronize Checklist items.");
    }

    await TaskRepository.syncSubtasks(taskId, subtasks);

    // Logging audit trail logs
    await TaskRepository.createHistoryEvent({
      id: "hist_" + Math.random().toString(36).substr(2, 9),
      taskId,
      actorId,
      actorName,
      type: "subtask_update",
      detail: "Synchronized active checklist items",
      timestamp: new Date().toISOString(),
    });

    return TaskRepository.findById(taskId);
  }

  static async updateTaskDetails(
    taskId: string,
    actorId: string,
    actorName: string,
    details: {
      title?: string;
      description?: string;
      assignedTo?: string;
      priority?: string;
      dueDate?: string;
      status?: string;
      projectName?: string;
      estimatedHours?: number;
    }
  ) {
    const task = await TaskRepository.findById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const updateData: any = {};
    if (details.title !== undefined) updateData.title = details.title;
    if (details.description !== undefined) updateData.description = details.description;
    if (details.assignedTo !== undefined) updateData.assignedTo = details.assignedTo;
    if (details.priority !== undefined) updateData.priority = details.priority;
    if (details.dueDate !== undefined) updateData.dueDate = details.dueDate;
    if (details.status !== undefined) updateData.status = details.status;
    if (details.projectName !== undefined) updateData.projectName = details.projectName;
    if (details.estimatedHours !== undefined) updateData.estimatedHours = Number(details.estimatedHours);

    const updated = await TaskRepository.update(taskId, updateData);

    // Logging update action history
    await TaskRepository.createHistoryEvent({
      id: "hist_" + Math.random().toString(36).substr(2, 9),
      taskId,
      actorId,
      actorName,
      type: "details_update",
      detail: "Updated task core details configurations",
      timestamp: new Date().toISOString(),
    });

    return updated;
  }
}
