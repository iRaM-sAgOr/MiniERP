import { Router } from "express";
import {
  addTaskComment,
  appendWorklogItem,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  deleteWorklogItem,
  getTasks,
  getManagerState,
  managerGeneratePasswordReset,
  punch,
  sendEmail,
  sendMessage,
  updateProfile,
  updateRole,
  updateTask,
  updateTaskSubtasks,
  getConversationMessages,
  getMessageContacts,
  getOnlineMessageUsers,
  getSentEmailLogs,
  updateProject,
} from "../controllers/erp.controller.js";
import { getProjects } from "../controllers/project.controller.js";
import { getWorkLogs } from "../controllers/worklog.controller.js";
import { getAttendance } from "../controllers/attendance.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { handleAvatarUpload } from "../middleware/upload.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("Manager"));

router.get("/state", getManagerState);
router.get("/projects", getProjects);
router.get("/worklogs", getWorkLogs);
router.get("/messages/contacts", getMessageContacts);
router.get("/messages/conversation", getConversationMessages);
router.get("/messages/online-users", getOnlineMessageUsers);
router.get("/sent-email-logs", getSentEmailLogs);
router.get("/attendance", getAttendance);
router.get("/tasks", getTasks);
router.post("/punch", punch);
router.post("/worklog/append-item", appendWorklogItem);
router.post("/worklog/delete-item", deleteWorklogItem);
router.post("/send-email", sendEmail);
router.post("/task", createTask);
router.post("/task/update", updateTask);
router.post("/task/comment", addTaskComment);
router.post("/task/subtasks", updateTaskSubtasks);
router.post("/task/delete", deleteTask);
router.post("/project", createProject);
router.post("/project/update", updateProject);
router.post("/project/delete", deleteProject);
router.post("/update-role", updateRole);
router.post("/profile", handleAvatarUpload, updateProfile);
router.post("/password-reset/generate", managerGeneratePasswordReset);
router.post("/message", sendMessage);

export default router;