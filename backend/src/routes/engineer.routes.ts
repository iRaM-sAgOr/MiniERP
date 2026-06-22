import { Router } from "express";
import {
  addTaskComment,
  appendWorklogItem,
  deleteWorklogItem,
  getConversationMessages,
  getEngineerState,
  getMessageContacts,
  getSentEmailLogs,
  getTasks,
  punch,
  sendEmail,
  sendMessage,
  updateProfile,
  updateTask,
  updateTaskSubtasks,
} from "../controllers/erp.controller.js";
import { getProjects } from "../controllers/project.controller.js";
import { getWorkLogs } from "../controllers/worklog.controller.js";
import { getAttendance } from "../controllers/attendance.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { handleAvatarUpload } from "../middleware/upload.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("Engineer"));

router.get("/state", getEngineerState);
router.get("/projects", getProjects);
router.get("/worklogs", getWorkLogs);
router.get("/messages/contacts", getMessageContacts);
router.get("/messages/conversation", getConversationMessages);
router.get("/sent-email-logs", getSentEmailLogs);
router.get("/attendance", getAttendance);
router.get("/tasks", getTasks);
router.post("/punch", punch);
router.post("/worklog/append-item", appendWorklogItem);
router.post("/worklog/delete-item", deleteWorklogItem);
router.post("/send-email", sendEmail);
router.post("/task/update", updateTask);
router.post("/task/comment", addTaskComment);
router.post("/task/subtasks", updateTaskSubtasks);
router.post("/profile", handleAvatarUpload, updateProfile);
router.post("/message", sendMessage);

export default router;