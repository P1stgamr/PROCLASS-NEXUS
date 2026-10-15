import { Router, type IRouter } from "express";
import {
  EndExamSessionResponse,
  StartExamSessionBody,
  StartExamSessionResponse,
} from "@workspace/api-zod";
import { adminDb } from "../lib/firebaseAdmin";
import { requireFirebaseAuth, type AuthenticatedRequest } from "../lib/firebaseAuth";

const router: IRouter = Router();
const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
const ALLOWED_RETURN_PATHS = [
  "/exam-room/",
  "/model-test/",
  "/daily-quiz/",
  "/premium-model-test/",
];

router.put(
  "/exam-sessions/current",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    const parsed = StartExamSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { examId, expiresAt, returnPath } = parsed.data;
    const now = Date.now();
    if (
      expiresAt <= now ||
      expiresAt > now + MAX_SESSION_MS ||
      !ALLOWED_RETURN_PATHS.some((prefix) => returnPath.startsWith(prefix)) ||
      returnPath.startsWith("//")
    ) {
      res.status(400).json({ error: "Invalid active exam session" });
      return;
    }
    await adminDb.ref(`activeExamSessions/${req.firebaseUser!.uid}`).set({
      examId,
      expiresAt,
      returnPath,
      startedAt: now,
    });
    res.json(StartExamSessionResponse.parse({ ok: true }));
  },
);

router.delete(
  "/exam-sessions/current",
  requireFirebaseAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    await adminDb.ref(`activeExamSessions/${req.firebaseUser!.uid}`).remove();
    res.json(EndExamSessionResponse.parse({ ok: true }));
  },
);

export default router;
