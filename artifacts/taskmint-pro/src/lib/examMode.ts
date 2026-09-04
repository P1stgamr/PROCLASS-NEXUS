const ACTIVE_EXAM_KEY = "taskmint-active-exam";

type ActiveExam = {
  examId: string;
  expiresAt: number;
};

export function startExamMode(examId: string, durationMs = 3 * 60 * 60 * 1000) {
  if (typeof window === "undefined" || !examId) return;
  window.localStorage.setItem(ACTIVE_EXAM_KEY, JSON.stringify({
    examId,
    expiresAt: Date.now() + durationMs,
  } satisfies ActiveExam));
}

export function endExamMode(examId?: string) {
  if (typeof window === "undefined") return;
  const active = getActiveExam();
  if (!examId || !active || active.examId === examId) {
    window.localStorage.removeItem(ACTIVE_EXAM_KEY);
  }
}

export function getActiveExam(): ActiveExam | null {
  if (typeof window === "undefined") return null;
  try {
    const active = JSON.parse(window.localStorage.getItem(ACTIVE_EXAM_KEY) || "null") as ActiveExam | null;
    if (!active?.examId || !Number.isFinite(active.expiresAt)) return null;
    if (active.expiresAt <= Date.now()) {
      window.localStorage.removeItem(ACTIVE_EXAM_KEY);
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