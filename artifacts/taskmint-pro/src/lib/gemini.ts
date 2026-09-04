export async function* streamGemini(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userText: string
): AsyncGenerator<string> {
  const activeExam = typeof window !== "undefined"
    ? window.localStorage.getItem("taskmint-active-exam")
    : null;
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history, userText, activeExamId: activeExam ? "active" : undefined }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "AI request failed");
  if (payload.text) yield payload.text;
}
