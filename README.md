# StudyDuel ⚔️📚

An AI study platform in the spirit of NotebookLM, built for Pakistani students (Matric, FSc, O-Levels). It adds group study, live battles between friends, and in-app voice calls with screen sharing.

Drop in a chapter (PDF, photos of book pages, or pasted notes) and StudyDuel turns it into a complete study kit:

- Simple explanations with diagrams and **Page X** citations
- Summaries, flashcards and timed MCQ tests
- A mind map, a two-host podcast and interactive experiments
- Board-pattern guess papers and a study plan
- A boss battle, explain-it-back, handwriting grading and a voice quiz

Content is available in **English, Urdu or Roman Urdu**.

> **Demo safety:** click **Load demo data** (Home, Account, or the landing page). It loads a full sample chapter ("Force & Motion") with every AI result pre-generated. The whole study experience then works with **no internet and no API keys**.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix), Framer Motion |
| Routing | React Router |
| Local data | IndexedDB via **Dexie.js**: documents, chunks, AI cache, flashcards (SM-2), attempts, mistakes, plans, XP |
| Cloud | **Firebase** only for Google Auth and Firestore (groups, members, battles, doubts, focus room, call signaling) |
| AI | Vercel serverless function `/api/ai`: Gemini → Groq → optional OpenAI-compatible provider, with multi-key fallback and zod validation |
| Docs | pdf.js (in-browser extraction and page rendering) |
| Media | WebRTC mesh calls and `getDisplayMedia` screen share; Web Speech API for TTS and STT; WebAudio sound effects |
| Visuals | Mermaid (diagrams), React Flow (mind map), Recharts (charts), canvas simulations |

---

## 1. Run locally

```bash
npm install
cp .env.example .env      # then fill in the keys (see below)
npm run dev               # http://localhost:5173
```

`npm run dev` also serves **`/api/ai`**. A small Vite middleware runs the exact same code as the Vercel function, so you don't need the Vercel CLI. Keys in `.env` are only read on the server side.

Other scripts: `npm run build` (typecheck + production build), `npm run preview`.

> With no keys at all, the app still runs. The demo chapter works fully, and new uploads show a friendly "add your keys" error with a retry button.

---

## 2. AI keys (server-side only)

All AI calls go through **one** endpoint, `POST /api/ai` with `{ task, payload }`. The browser never sees a key.

| Variable | What |
| --- | --- |
| `GEMINI_API_KEYS` | Primary provider. Comma-separated keys from <https://aistudio.google.com/apikey>. Also used for **vision** (book-page OCR and handwriting grading). |
| `GEMINI_MODELS` | Optional model fallback list, default `gemini-flash-latest,gemini-flash-lite-latest,gemini-3.5-flash` (the `-latest` aliases never retire) |
| `GROQ_API_KEYS` | Secondary provider. Comma-separated keys from <https://console.groq.com/keys> |
| `GROQ_MODELS` | Optional, default `openai/gpt-oss-120b,llama-3.3-70b-versatile` |
| `EXTRA_PROVIDER_BASE_URL` | Optional third provider: any OpenAI-compatible API (freellmapi, OpenRouter, Together…), e.g. `https://openrouter.ai/api/v1` |
| `EXTRA_PROVIDER_API_KEYS` | Comma-separated keys for it |
| `EXTRA_PROVIDER_MODELS` | Model name(s) for it, comma-separated |
| `EXTRA_PROVIDER_NAME` | Optional label for logs (e.g. `cerebras`) |
| `EXTRA_PROVIDER_JSON_MODE` | `false` if that API rejects `response_format: json_object` |
| `AI_TIMEOUT_MS` | Per-attempt timeout (default 25000); a whole request is capped at ~52 s to fit Vercel's 60 s limit |
| `ALLOWED_ORIGINS` | CORS for `/api/ai` (default `*`) |

**How the fallback works** (`api/_lib/runner.ts`):

1. Providers are tried in order: Gemini, then Groq, then the extra provider (only those with keys).
2. Each provider can have several **models**, and each model is tried with every key:
   - **Key problems** (429 rate limit / quota / 401-403) → next key.
   - **Model problems** (503 overloaded, 404 model retired, 5xx, timeout) → other keys won't help, so jump to the next model or provider.
   - A key that just hit a 429 is tried last for the next 60 s.
3. Every attempt is logged, showing only the last 4 characters of the key: `[ai] ✗ gemini key …a1b2 → HTTP 429`.
4. Structured tasks ask for JSON. The JSON schema (generated from zod) goes in the prompt, and the reply is validated with **zod**. If it's invalid, the whole chain is retried **once** with the validation error attached.
5. Responses share one envelope: `{ ok: true, task, provider, model, data, ms }` or `{ ok: false, error, attempts }`.

Tasks: `explain`, `summary`, `flashcards`, `mcqs`, `guessPaper`, `studyPlan`, `mindmap`, `podcast`, `grade` (vision), `doubt`, `explainBack`, `ocr` (vision), `pickSimulation`.

Every result is cached in IndexedDB (`aiCache`), keyed by task, document and settings (language, difficulty, mode, board…). The same content is never generated twice, and switching back to a previous language is instant.

---

## 3. Firebase setup (auth + group features)

1. Go to <https://console.firebase.google.com> and click **Add project** (Analytics isn't needed).
2. Under **Build → Authentication → Get started → Sign-in method**, enable **Google**.
3. Under **Authentication → Settings → Authorized domains**, make sure `localhost` is listed. Later, add your Vercel domain (e.g. `studyduel.vercel.app`).
4. Under **Build → Firestore Database → Create database**, pick **production mode** and a region close to you (e.g. `asia-south1`).
5. Publish the security rules in `firestore.rules`, either way:
   - **Console:** Firestore → **Rules** tab → paste the file → **Publish**.
   - **CLI:** `npx firebase-tools login && npx firebase-tools deploy --only firestore:rules --project <your-project-id>`
6. Go to **Project settings (⚙) → General → Your apps → Web app (</>)**, register an app and copy the config into `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

(Firebase web config is public by design. The security rules are what protect the data.)

No composite indexes are needed; all queries use single-field indexes.

### Test groups without a Firebase project (emulators)

```bash
npx firebase-tools emulators:start --only auth,firestore --project demo-studyduel   # needs Java
VITE_FIREBASE_EMULATORS=true npm run dev
```

In emulator mode the sign-in card offers a **"sign in as test user"** box. Open two browser windows (or a phone on your LAN) to try groups, battles and calls.

### Security rules summary (`firestore.rules`)

- Only members of a group (`groups/{gid}.memberIds`) can read or write anything under that group.
- Joining: a non-member may add **only themselves**, and only if the group has fewer than **3** members. Invite codes resolve via `invites/{code}`; you can fetch a single code but not list them.
- Leaving: a member may remove only themselves. Ownership may pass to a remaining member, and the last member can delete the group.
- Each user writes only their own member profile, battle answers, call-participant doc and signals (`from == me`). Doubts are edited only by their author.
- The rules are covered by 36 emulator tests (join/leave, 3-member cap, spoofing attempts, outsider access).

---

## 4. Deploy to Vercel

1. Push the repo to GitHub, then on <https://vercel.com/new> import it. Vercel detects **Vite**: build `npm run build`, output `dist`.
2. Under **Settings → Environment Variables**, add every variable from `.env.example`. The `GEMINI_*`, `GROQ_*` and `EXTRA_*` ones must **not** have a `VITE_` prefix.
3. Deploy. `api/ai.ts` becomes the serverless function (60 s max duration, set in `vercel.json`). All other routes rewrite to the SPA.
4. Add your `*.vercel.app` domain to Firebase **Authorized domains**.

### Importing into Lovable

The stack is standard Vite + React + TS + Tailwind + shadcn/ui (`components.json` included), so Lovable can import it directly. Lovable doesn't run the `/api` folder, so:

1. Deploy the repo to Vercel once (above).
2. In Lovable, set `VITE_API_BASE_URL=https://<your-app>.vercel.app`. The frontend will then call the Vercel `/api/ai`. Optionally restrict `ALLOWED_ORIGINS` on Vercel to your Lovable domain.

---

## 5. Voice calls & TURN

Calls use a WebRTC **mesh** (max 3 people, one peer connection per pair) with the "perfect negotiation" pattern. That lets screen share be added mid-call via `addTrack`/`replaceTrack` and renegotiation.

- **Signaling** lives in `groups/{gid}/calls/live/{participants,signals}`. Each join uses a fresh session id, so stale signals are ignored.
- **Cleanup:** each user's signals are deleted when they leave, crashed participants are pruned by heartbeat, and the last person out deletes the call.
- **ICE servers:** STUN `stun:stun.l.google.com:19302` is always included. On strict school or mobile networks, add a TURN server (e.g. Metered, Twilio or self-hosted coturn):

```
VITE_TURN_URLS=turn:your.turn.server:3478,turns:your.turn.server:5349
VITE_TURN_USERNAME=...
VITE_TURN_CREDENTIAL=...
```

The call UI is a floating, draggable, minimisable panel mounted at the app root, so you can keep studying and switching pages during a call.

---

## Feature map

| # | Feature | Where |
| --- | --- | --- |
| 1 | Upload PDF / text / photos (camera capture) → per-page chunks | `components/UploadDialog.tsx`, `lib/ingest.ts`, `lib/pdf.ts` |
| 2 | Topic-by-topic explanation with Mermaid diagrams and charts | `features/ExplanationTab.tsx` |
| 3 | "Page X" citation → exact page (pdf.js / photo / text) | `components/DocViewer.tsx` |
| 4 | One-page summary | `features/SummaryTab.tsx` |
| 5 | Read aloud with sentence highlight, play/pause, speed | `hooks/useReadAloud.ts`, `lib/speech.ts` |
| 6 | Flashcards with flip + SM-2 (Again/Hard/Easy) | `features/FlashcardsTab.tsx`, `lib/sm2.ts` |
| 7 | Timed MCQ test with explanations | `features/McqTab.tsx` |
| 8 | Easy/Medium/Hard + SLO vs Concept mode | `components/StudySettings.tsx` |
| 9 | Mistake notebook + revise mode | `pages/Mistakes.tsx` |
| 10 | Guess paper (Sindh, Federal, O-Levels, Custom) + print/PDF | `features/GuessPaperTab.tsx` |
| 11 | Day-by-day study plan (AI, with offline fallback) | `pages/StudyPlan.tsx`, `lib/localPlan.ts` |
| 12 | Exam readiness gauge | `lib/progress.ts → readiness()`, `components/Gauge.tsx` |
| 13 | English / Urdu / Roman Urdu | `lib/settings.ts`, prompt rules in `api/_lib/tasks.ts` |
| 14 | Podcast (2 hosts, 2 voices, animated bubbles) | `features/PodcastTab.tsx` |
| 15 | Animated teacher avatar | `components/TeacherAvatar.tsx` |
| 16 | Interactive mind map | `features/MindMapTab.tsx` |
| 17 | Experiment simulations (AI picks one) | `src/sims/*`, `features/ExperimentsTab.tsx` |
| 18 | Boss battle | `features/arena/BossBattle.tsx` |
| 19 | Explain-it-back (typed or spoken) | `features/arena/ExplainBack.tsx` |
| 20 | Handwriting grading (Gemini vision) | `features/arena/HandwritingGrade.tsx` |
| 21 | Voice quiz | `features/arena/VoiceQuiz.tsx` |
| 22 | Google sign-in | `lib/firebase.ts` |
| 23 | Groups (6-digit code / QR, max 3) + shared material | `pages/Groups.tsx`, `pages/GroupDetail.tsx`, `lib/groups.ts` |
| 24 | Live Kahoot-style battle | `pages/LiveBattle.tsx`, `features/group/BattleLauncher.tsx` |
| 25 | Leaderboard, XP, streaks, badges | `features/group/Leaderboard.tsx`, `lib/progress.ts` |
| 26 | Doubt board (AI answers first, with citations) | `features/group/DoubtBoard.tsx` |
| 27 | Focus room (shared Pomodoro) | `features/group/FocusRoom.tsx` |
| 28 | Weekly report card | `features/group/ReportCard.tsx` |
| 29–33 | Voice call, screen share, Firestore signaling, STUN/TURN, floating panel | `lib/call/CallManager.ts`, `components/call/*` |

## Project structure

```
api/ai.ts                 Vercel function (CORS + handler)
api/_lib/                 providers.ts (Gemini/Groq/OpenAI-compatible), tasks.ts (prompts), runner.ts (fallback + zod)
shared/schemas.ts         zod schemas + types shared by API and frontend
src/lib/                  db (Dexie), aiClient, ingest, pdf, sm2, speech, sfx, progress, groups, firebase, call/
src/features/             workspace tabs, arena modes, group features
src/pages/                Landing, Dashboard, Workspace, StudyPlan, Mistakes, Groups, GroupDetail, LiveBattle, Join, Profile
src/sims/                 canvas simulations (incline, pendulum, projectile, circuit, waves)
firestore.rules           security rules;  firebase.json  rules + emulator config
```

---

## Decisions & defaults (chosen where the brief left room)

- **Design:** black canvas, warm charcoal cards, cream text, coral and gold accents. Headings use *Instrument Serif*, body text uses *DM Sans* (Urdu uses *Noto Nastaliq Urdu*). The layout is laptop-first (sidebar), with a bottom tab bar on phones. Dark mode is the default; System/Light/Dark is under Account.
- **Workspace tabs:** Explanation, Summary, Flashcards, MCQs, Mind Map, Podcast, Experiments, Guess Paper, plus an **Arena** tab that holds Boss battle, Explain-back, Handwriting grading and Voice quiz.
- **Diagrams:** Mermaid inside explanations; **React Flow** for the interactive mind map (radial auto-layout, no extra layout library).
- **Chunking:** one or more ~1.8k-character chunks per page, each tagged with its page number. Pasted text is split into pseudo-pages of about 2.5k characters so citations still work. Scanned PDFs without a text layer are rejected with a hint to upload photos instead (OCR goes through Gemini vision, one photo = one page).
- **Context limits:** Gemini receives up to ~120k characters of the chapter; Groq and the extra provider get ~24k (head plus tail, to respect free-tier token limits).
- **Readiness score:** a recency-weighted quiz accuracy (60%), flashcard retention × coverage (25%) and practice volume (15%), clamped to 5–99%.
- **Live battle:** each device times questions from when *it* received them (avoids clock skew between phones). Points are `500 + 500 × time left`, and the host device drives the state machine. Joining a battle from a phone = scan the group QR (or enter the 6-digit code) → auto-join the group → jump into the running battle. Groups are capped at 3, so battles are too.
- **Shared material** stores up to ~350k characters of page text (Firestore's 1 MiB doc limit) plus up to 150 flashcards. Friends click **Study this** to copy it into their own local library.
- **Doubt board:** the AI answers from a chapter shared in the group, so page citations work for every member.
- **Weekly leaderboard:** each user's local stats (XP, accuracy, cards, focus minutes, badges) are mirrored to their member doc in every group they belong to, keyed by ISO week (resets Monday).
- **Urdu speech:** needs an `ur-PK` voice. Edge and Android include one; otherwise the closest voice is used. Roman Urdu is read with an `en-IN`/`hi-IN` voice. Speech recognition works best in Chrome/Edge.
- **Demo data** includes a small sample practice history (a few quizzes and 2 mistakes) so the readiness gauge and charts aren't empty on first open.
- **Known limits:** `/api/ai` is public (no auth or rate limit). For a public launch, add Firebase ID-token verification or a per-IP limit. Generated study plans for the demo use the AI when available and fall back to the offline planner otherwise.
