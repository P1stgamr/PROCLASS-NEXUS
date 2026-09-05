import { Router } from "express";

const router = Router();

const SYSTEM_PROMPT = `You are TaskMint AI — an intelligent assistant built into the TaskMint Pro student platform. You are helpful, friendly, and speak both Bangla and English naturally, switching based on the user's language.

Help with SSC, HSC and university study, programming, notes, essays, study plans, quizzes and competition preparation. Use Markdown, be concise but thorough, explain math step-by-step, and encourage students.`;

router.post("/ai/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const userText = typeof req.body?.userText === "string" ? req.body.userText.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (req.body?.activeExamId || req.body?.examActive === true) {
    return res.status(403).json({ error: "AI is unavailable while an exam is active." });
  }
  if (!apiKey) {
    return res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY in Replit Secrets." });
  }
  if (!userText || userText.length > 6000) {
    return res.status(400).json({ error: "Message must be between 1 and 6000 characters." });
  }

  const safeHistory = history
    .filter((item: any) => (item?.role === "user" || item?.role === "assistant") && typeof item?.content === "string")
    .slice(-20)
    .map((item: any) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content.slice(0, 6000) }],
    }));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [...safeHistory, { role: "user", parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    const payload = await response.json() as any;
    if (!response.ok) {
      req.log.error({
        status: response.status,
        provider: payload?.error?.status,
        providerMessage: payload?.error?.message,
      }, "Gemini request failed");
      return res.status(502).json({ error: "Gemini request failed. Please try again." });
    }
    const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";
    if (!text.trim()) {
      req.log.warn({ finishReason: payload?.candidates?.[0]?.finishReason }, "Gemini returned no text");
      return res.status(502).json({ error: "Gemini returned an empty response. Please try again." });
    }
    return res.json({ text });
  } catch (error) {
    req.log.error({ error }, "Gemini proxy failed");
    if ((error as any)?.name === "AbortError") {
      return res.status(504).json({ error: "The AI service timed out. Please try again." });
    }
    return res.status(502).json({ error: "Unable to reach Gemini right now." });
  }
});

export default router;