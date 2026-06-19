import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const genAI = new GoogleGenerativeAI(API_KEY);

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

export async function* streamGemini(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userText: string
): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-8b",
    systemInstruction: AI_SYSTEM_PROMPT,
  });

  const geminiHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessageStream(userText);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
