export async function* streamGemini(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userText: string
): AsyncGenerator<string> {
  const activeExam = typeof window !== "undefined"
    ? window.localStorage.getItem("taskmint-active-exam")
    : null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 35_000);
  let response: Response;
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
    response = await fetch(`${apiBase}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, userText, activeExamId: activeExam ? "active" : undefined }),
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("AI request timed out. Please try again.");
    throw new Error("Could not reach the AI service. Check your connection and try again.");
  } finally {
    window.clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) throw new Error("AI is unavailable while an exam is active.");
    if (response.status === 503) throw new Error("AI is not configured right now. Please contact an administrator.");
    if (response.status === 504) throw new Error("The AI service took too long to respond. Please try again.");
    throw new Error(payload.error || "The AI service failed. Please try again.");
  }
  if (!payload.text) throw new Error("The AI returned an empty response. Please try again.");
  yield payload.text;
}
