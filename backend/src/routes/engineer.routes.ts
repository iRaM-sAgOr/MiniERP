import { Router } from "express";
import {
  addTaskComment,
  getEngineerState,
  punch,
  sendEmail,
  sendMessage,
  updateTask,
  updateTaskSubtasks,
  worklog,
} from "../controllers/erp.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireRole("Engineer"));

router.get("/state", getEngineerState);
router.post("/punch", punch);
router.post("/worklog", worklog);
router.post("/send-email", sendEmail);
router.post("/task/update", updateTask);
router.post("/task/comment", addTaskComment);
router.post("/task/subtasks", updateTaskSubtasks);
router.post("/message", sendMessage);

export default router;