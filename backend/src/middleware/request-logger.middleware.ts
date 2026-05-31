import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { logger } from "../config/logger.js";

export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info("api_request", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: req.user?.id || null,
      roleType: req.user?.roleType || null,
      ip: req.ip,
      userAgent: req.get("user-agent") || null,
    });
  });

  next();
};
