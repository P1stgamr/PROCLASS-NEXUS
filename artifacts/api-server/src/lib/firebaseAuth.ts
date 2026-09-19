import type { NextFunction, Request, Response } from "express";
import { adminAuth } from "./firebaseAdmin";

export interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Firebase authentication is required" });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = { uid: decoded.uid, email: decoded.email, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired Firebase session" });
  }
}