import type { Request, Response } from "express";
import { getRequestUserId } from "../middleware/auth.middleware.js";
import { MessageService } from "../services/message.service.js";

export const getMessages = async (req: Request, res: Response) => {
  try {
    const messages = await MessageService.getVisibleMessages(getRequestUserId(req));
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};