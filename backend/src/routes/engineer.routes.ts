import { Router } from "express";
import {
  addTaskComment,
  getEngineerState,
  punch,
  sendEmail,
  sendMessage,
  updateProfile,
  updateTask,
  updateTaskSubtasks,
  worklog,
} from "../controllers/erp.controller.js";
import { getProjects } from "../controllers/project.controller.js";
import { getWorkLogs } from "../controllers/worklog.controller.js";
import { getMessages } from "../controllers/message.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("Engineer"));

router.get("/state", getEngineerState);
router.get("/projects", getProjects);
router.get("/worklogs", getWorkLogs);
router.get("/messages", getMessages);
router.post("/punch", punch);
router.post("/worklog", worklog);
router.post("/send-email", sendEmail);
router.post("/task/update", updateTask);
router.post("/task/comment", addTaskComment);
router.post("/task/subtasks", updateTaskSubtasks);
router.post("/profile", updateProfile);
router.post("/message", sendMessage);

export default router;