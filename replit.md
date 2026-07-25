# TaskMint Pro

A premium full-stack student platform with study tools, AI assistant, competitions, premium exams, and a reward system. Primarily targets students in Bangladesh (supports both Bangla and English).

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui components
- **Auth / Database / Storage**: Firebase (Realtime Database, Auth, Storage)
- **AI**: Google Gemini (`gemini-1.5-flash-8b`) + OpenAI (optional)
- **API server**: Express 5 + Drizzle ORM + PostgreSQL (optional backend)
- **Monorepo**: pnpm workspace

## Project structure

```
artifacts/
  taskmint-pro/   # React/Vite frontend (main app)
  api-server/     # Express REST API (optional backend)
artifacts/mockup-sandbox/  # Design prototyping server
lib/
  db/             # Drizzle ORM schema + PostgreSQL client
  api-spec/       # OpenAPI spec
  api-zod/        # Generated Zod schemas
  api-client-react/ # Generated React Query hooks
```

## How to run

The **TaskMint Pro** workflow runs the frontend:
```
PORT=19249 BASE_PATH=/ pnpm --filter @workspace/taskmint-pro run dev
```
The app is served on port 19249 (external port 80 / the default preview).

To also run the API server:
```
PORT=8080 pnpm --filter @workspace/api-server run dev
```
The API server requires a `DATABASE_URL` secret (PostgreSQL connection string).

## Environment variables / secrets

| Variable | Where used | Required? |
|---|---|---|
| `GEMINI_API_KEY` | Frontend AI assistant (Gemini) | Optional — AI chat won't work without it |
| `VITE_OPENAI_API_KEY` | Frontend AI assistant (OpenAI fallback) | Optional |
| `DATABASE_URL` | API server (Drizzle/PostgreSQL) | Required only if running the API server |
| `SESSION_SECRET` | API server session middleware | Required only if running the API server |

Firebase credentials are hardcoded in `artifacts/taskmint-pro/src/firebase.ts` (project: `taskmitpro`).

## User preferences

- Keep the existing project structure — do not restructure or migrate unless asked.
