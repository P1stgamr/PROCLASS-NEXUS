import { useEffect, useState } from "react";
import { endExamSession as clearRemoteExamSession, startExamSession as setRemoteExamSession } from "@workspace/api-client-react";
import { auth } from "@/firebase";

const ACTIVE_EXAM_KEY = "taskmint-active-exam";
const EXAM_MODE_EVENT = "taskmint:exam-mode-change";
let sessionSyncQueue: Promise<void> = Promise.resolve();

type ActiveExam = {
  examId: string;
  expiresAt: number;
  returnPath?: string;
};

function notifyExamModeChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EXAM_MODE_EVENT));
  }
}

function queueRemoteSessionSync(operation: () => Promise<unknown>) {
  sessionSyncQueue = sessionSyncQueue
    .then(operation)
    .then(() => undefined)
    .catch(() => undefined);
}

export function startExamMode(
  examId: string,
  durationMs = 3 * 60 * 60 * 1000,
  returnPath?: string,
) {
  if (typeof window === "undefined" || !examId) return;
  window.localStorage.setItem(ACTIVE_EXAM_KEY, JSON.stringify({
    examId,
    expiresAt: Date.now() + durationMs,
    ...(returnPath ? { returnPath } : {}),
  } satisfies ActiveExam));
  const session = {
    examId,
    expiresAt: Date.now() + durationMs,
    returnPath: returnPath || `/exam-room/${encodeURIComponent(examId)}`,
  };
  queueRemoteSessionSync(() => setRemoteExamSession(session));
  notifyExamModeChange();
}

export function endExamMode(examId?: string) {
  if (typeof window === "undefined") return;
  const active = getActiveExam();
  if (!examId || !active || active.examId === examId) {
    window.localStorage.removeItem(ACTIVE_EXAM_KEY);
    queueRemoteSessionSync(() => clearRemoteExamSession());
    notifyExamModeChange();
  }
}

export function getActiveExam(): ActiveExam | null {
  if (typeof window === "undefined") return null;
  try {
    const active = JSON.parse(window.localStorage.getItem(ACTIVE_EXAM_KEY) || "null") as ActiveExam | null;
    if (!active?.examId || !Number.isFinite(active.expiresAt)) return null;
    if (active.expiresAt <= Date.now()) {
      window.localStorage.removeItem(ACTIVE_EXAM_KEY);
      queueRemoteSessionSync(() => clearRemoteExamSession());
      notifyExamModeChange();
      return null;
    }
    return active;
  } catch {
    window.localStorage.removeItem(ACTIVE_EXAM_KEY);
    return null;
  }
}

export function isExamModeActive() {
  return Boolean(getActiveExam());
}

export function subscribeExamMode(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EXAM_MODE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EXAM_MODE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getExamReturnPath(active: ActiveExam) {
  const path = active.returnPath || `/exam-room/${encodeURIComponent(active.examId)}`;
  const allowed = ["/exam-room/", "/model-test/", "/daily-quiz/", "/premium-model-test/"];
  return allowed.some((prefix) => path.startsWith(prefix)) ? path : `/exam-room/${encodeURIComponent(active.examId)}`;
}

export function useExamMode() {
  const [activeExam, setActiveExam] = useState(getActiveExam);
  useEffect(() => {
    const refresh = () => setActiveExam(getActiveExam());
    const unsubscribe = subscribeExamMode(refresh);
    refresh();
    return unsubscribe;
  }, []);
  return activeExam;
}