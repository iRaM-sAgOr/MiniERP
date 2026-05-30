import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  addTaskComment,
  createProject,
  createTask,
  deleteProject,
  getState,
  login,
  punch,
  register,
  resetDatabase,
  sendEmail,
  sendMessage,
  updateRole,
  updateTask,
  updateTaskSubtasks,
  worklog,
} from "../controllers/erp.controller.js";

const router = Router();

router.get("/erp/state", requireAuth, getState);
router.post("/erp/login", login);
router.post("/erp/register", register);

router.use(requireAuth);

router.post("/erp/punch", punch);
router.post("/erp/worklog", worklog);
router.post("/erp/send-email", sendEmail);
router.post("/erp/task", createTask);
router.post("/erp/task/update", updateTask);
router.post("/erp/task/comment", addTaskComment);
router.post("/erp/task/subtasks", updateTaskSubtasks);
router.post("/erp/project", createProject);
router.post("/erp/project/delete", deleteProject);
router.post("/erp/update-role", updateRole);
router.post("/erp/message", sendMessage);
router.post("/erp/reset", resetDatabase);

export default router;
