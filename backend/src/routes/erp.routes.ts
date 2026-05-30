import { Router } from "express";
import authRoutes from "./auth.routes.js";
import managerRoutes from "./manager.routes.js";
import engineerRoutes from "./engineer.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/manager", managerRoutes);
router.use("/engineer", engineerRoutes);

export default router;
