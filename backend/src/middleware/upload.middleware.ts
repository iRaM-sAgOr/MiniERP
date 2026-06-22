import type { RequestHandler } from "express";
import multer from "multer";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/png", "image/jpeg"]);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Only PNG and JPEG files are allowed for profile images."));
      return;
    }

    cb(null, true);
  },
}).single("avatarFile");

export const handleAvatarUpload: RequestHandler = (req, res, next) => {
  avatarUpload(req, res, (err: any) => {
    if (!err) {
      next();
      return;
    }

    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Profile image must be 5MB or smaller." });
      return;
    }

    res.status(400).json({ error: err.message || "Invalid profile image upload." });
  });
};
