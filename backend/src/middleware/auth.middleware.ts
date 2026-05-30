import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "minierp-dev-secret";
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h") as jwt.SignOptions["expiresIn"];

export type AuthTokenPayload = jwt.JwtPayload & {
  roleType?: string;
  email?: string;
};

export type AuthenticatedUser = {
  id: string;
  roleType: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export const verifyAuthToken = (token: string) => {
  const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  if (!decoded.sub || !decoded.roleType) {
    throw new Error("JWT token is invalid.");
  }

  return {
    id: decoded.sub,
    roleType: decoded.roleType,
    email: decoded.email || "",
  } satisfies AuthenticatedUser;
};

export const createAuthToken = (member: { id: string; email: string; roleType: string }) => {
  return jwt.sign(
    { sub: member.id, roleType: member.roleType, email: member.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const sanitizeMember = <T extends { passwordHash?: string }>(member: T) => {
  const { passwordHash, ...safeMember } = member;
  return safeMember;
};

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "JWT token is required." });
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "JWT token has expired or is invalid." });
  }
};

export const requireRole = (...roles: Array<AuthenticatedUser["roleType"]>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "JWT token is required." });
    }

    if (!roles.includes(req.user.roleType)) {
      return res.status(403).json({ error: "You do not have access to this route." });
    }

    next();
  };
};

export const getRequestUserId = (req: AuthenticatedRequest) => req.user?.id ?? null;