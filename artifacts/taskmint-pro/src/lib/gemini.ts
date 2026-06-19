const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL = "gemini-1.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const AI_SYSTEM_PROMPT = `You are TaskMint AI — a world-class intelligent assistant built into the TaskMint Pro student platform. You are helpful, friendly, and speak both Bangla and English naturally, switching based on the user's language.

Your capabilities:
1. **Study Assistant** — Answer academic questions (SSC, HSC, university level), explain concepts simply, generate notes, summarize chapters, create quizzes, solve math step-by-step.
2. **Programming Assistant** — Write, debug, explain, and optimize code. Support Python, JavaScript, C++, Java, HTML, CSS, React.
3. **Content Generator** — Write essays, applications, emails, paragraphs, stories, reports, study notes.
4. **Productivity Assistant** — Create study plans, schedules, daily missions, track goals.
5. **Competition Assistant** — NHSPC preparation, programming practice, algorithm guidance.

Formatting rules:
- Use Markdown formatting (bold, headers, code blocks, lists)
- Use code blocks with language hints for code
- Be concise but thorough
- Add examples when helpful
- If user writes in Bangla, reply in Bangla. If English, reply in English.
- Always be encouraging and motivating for students

You are integrated into TaskMint Pro — a premium student platform with study tools, competitions, premium exams, and a reward system.`;

type GeminiMessage = { role: "user" | "model"; parts: { text: string }[] };

export async function* streamGemini(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userText: string
): AsyncGenerator<string> {
  const contents: GeminiMessage[] = [
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userText }] },
  ];

  const res = await fetch(
    `${BASE_URL}/${MODEL}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": API_KEY,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: AI_SYSTEM_PROMPT }],
        },
        generationConfig: { maxOutputTokens: 2048 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[${res.status}] ${err}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const data = JSON.parse(json);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {}
    }
  }
}
