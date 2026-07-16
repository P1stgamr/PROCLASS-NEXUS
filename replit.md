# ProClass

Bangladesh's best student ecosystem — Learn, Code, Compete, Earn with AI.

## Run & Operate

- `pnpm --filter @workspace/taskmint-pro run dev` — run the web app (via workflow)
- `pnpm --filter @workspace/api-server run dev` — run API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- React + Vite + Tailwind CSS + Framer Motion
- Firebase Auth + Firebase Realtime Database
- Wouter (routing), TanStack Query
- TypeScript 5.9, pnpm workspaces

## Where things live

- `artifacts/taskmint-pro/src/pages/` — all pages (20+)
- `artifacts/taskmint-pro/src/components/` — shared components
- `artifacts/taskmint-pro/src/context/AuthContext.tsx` — auth + user profile
- `artifacts/taskmint-pro/src/firebase.ts` — Firebase config
- `artifacts/taskmint-pro/src/lib/prizeUtils.ts` — prize distribution logic

## Firebase Paths

- `users/{uid}` — user profiles (coins, xp, level, streak, role, membership)
- `premiumExams/{examId}` — premium exam data
- `examEntries/{uid}/{examId}` — exam enrollment
- `examResults/{examId}/{uid}` — exam results + scores
- `paymentRequests/{id}` — bKash exam payment requests
- `membershipRequests/{uid}` — membership upgrade requests
- `withdrawRequests/{id}` — coin withdrawal requests
- `notifications/{uid}/{id}` — user notifications
- `gifts/{uid}/{giftId}` — admin gifts to users
- `courses/{courseId}` — course data
- `chat/{roomId}/messages` — chat messages

## Architecture decisions

- wouter for routing (lightweight, no history API issues with Replit proxy)
- Firebase Realtime DB only (no Firestore) — real-time sync across all pages
- Gemini API key injected via vite.config.ts define block from GEMINI_API_KEY secret
- bKash manual payment flow: user sends → submits txn ID → admin approves
- Prize distribution: 1st 40%, 2nd 20%, 3rd 10%, 4th-10th 10% split, admin 20%

## Product

ProClass is a premium educational platform for Bangladeshi students:

- **Study** — SSC, HSC, Olympiad, Programming quizzes with XP/coins rewards
- **Courses** — Free and premium courses (SSC/HSC/Programming/Olympiad)
- **Membership** — Free / Silver (৳99) / Gold (৳199) / Platinum (৳499) plans
- **Premium Exams** — Paid entry, real prizes via bKash, live leaderboard
- **AI Assistant** — Gemini-powered homework/coding/career help
- **Leaderboard** — XP, Coins, Streak rankings
- **Wallet** — Coin earnings, bKash withdrawals
- **Chat** — Real-time community chat
- **Gifts** — Admin sends coins/gifts to users
- **Admin Panel** — Payments, Withdrawals, Membership, Exams, Gifts, Users, Notify

## User preferences

- App name: ProClass
- Firebase project: taskmitpro
- Admin email: priommozumder@gmail.com
- bKash number: 01757098701
- Conversion: 1000 coins = ৳1 BDT
- Language: Bangla UI preferred

## Gotchas

- Gemini API key is `GEMINI_API_KEY` secret, injected as `VITE_GEMINI_API_KEY` in vite.config.ts
- Firebase database URL: `https://taskmitpro-default-rtdb.asia-southeast1.firebasedatabase.app`
- Admin check: `userProfile.role === "admin"` (or "super_admin")
- ProtectedRoute with `requireAdmin` redirects non-admins to /home
- PremiumExamPage icons `CalendarX`, `CalendarClock`, `Radio` must be imported from lucide-react
