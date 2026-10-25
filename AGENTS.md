<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands

- **Dev / Build**: `npm run dev` (`next dev --webpack`), `npm run build` (`next build --webpack`). Webpack is required (not Turbopack) for synchronous WebAssembly (`opencut-wasm`) and module aliases in `next.config.ts`.
- **Lint**: `npx eslint src/` or `npx eslint src/path/to/file.ts` (ESLint 9; ignores `opencut/**` and `src/opencut/**`). Avoid bare `npm run lint` when `.worktrees/` or `experiments/**/.venv/` exist locally, as scanning them can time out.
- **Typecheck**: `npx tsc --noEmit` (path alias `@/*` resolves to `./src/*`; excludes `opencut/`).
- **Tests**: Uses Node's built-in test runner (`node:test` + `node:assert/strict`) executed via `tsx`:
  - Single test file: `npx tsx --test src/path/to/file.test.ts`
  - Service unit tests: `npx tsx --test 'src/service/**/*.test.ts'`
  - All unit tests: `npx tsx --test 'src/**/*.test.ts'`
- **Scripts**: CLI scripts in `scripts/*.ts` call `loadEnvConfig(process.cwd())` from `@next/env` and run via `npx tsx scripts/<name>.ts` (see `package.json` for `seed:*`, `backfill:profiles`, and `migrate:folders`).

## Architecture & Conventions

- **Layering (`src/`)**:
  - `src/app/` — Next.js App Router pages and thin route entrypoints. Route handlers in `src/app/api/**/route.ts` only set `runtime` / `dynamic` and re-export handlers from `src/presentation/api/**`.
  - `src/presentation/` — Server Actions (`actions/*.ts`, `"use server"` wrappers delegating to `src/service/`), API route implementations (`api/`), studio shell (`studio/`, styled via `src/presentation/studio/tokens.css`), UI components (`components/`), and public DTO serializers (`serialize.ts`).
  - `src/service/` — Domain and business logic (AI storyboard director on Google Gemini, OpenRouter image/video generation queue, FFmpeg reel assembly & video editing, billing/credits, Firebase auth, MCP server).
  - `src/dao/` — MongoDB collection accessors (`getDb()` singleton in `src/dao/mongo.ts`). Always import collections from `@/dao`.
  - `src/model/` — TypeScript types and Zod schemas.
- **Naming Trap — Folders vs. Videos**:
  - A **Folder** (project container) uses model `Folder` (`src/model/folder.ts`) and is stored in the **`projects`** MongoDB collection (`projectsCollection()` in `src/dao/projects.ts`).
  - A **Video** (AI Influencer / explainer job) uses model `Project` (`src/model/project.ts`, with `projectId` pointing to its parent `Folder._id`) and is stored in the **`videos`** MongoDB collection (`videosCollection()` in `src/dao/videos.ts`).
- **Auth & Legacy Naming (`clerkUserId`)**:
  - Auth uses **Firebase Auth** (`firebase` / `firebase-admin`), **not Clerk**.
  - User and resource documents still store the Firebase `uid` in the field named `clerkUserId` (and helpers like `requireClerkUserId()` in `src/service/auth.ts` return the Firebase `uid`) for backward compatibility with existing MongoDB documents and indexes.
  - Web requests authenticate via the Firebase session cookie (`src/proxy.ts` — Next.js 16 proxy convention replacing `middleware.ts`).
  - REST API (`/api/v1/*`) and `/api/mcp` authenticate via `Authorization: Bearer <token>`, accepting either a Firebase ID token or an `exp_live_*` MCP API key (`src/service/api/auth.ts`), and bind the user via `AsyncLocalStorage` so `requireAppUser()` works unchanged across Server Actions and API routes.
- **Vendored OpenCut**:
  - `opencut/` (upstream reference checkout) and `src/opencut/` (vendored client editor code) are excluded from ESLint (`eslint.config.mjs`), and `opencut/` is excluded from `tsconfig.json`. The Scro ↔ OpenCut bridge lives in `src/opencut/embed/` and `src/service/opencut/`.
- **Generation Queue & Providers (`OPENROUTER_API_KEY`)**:
  - Long-running image/video jobs are persisted in `generation_jobs` (`generationJobsCollection()`), kicked off via `after()` (`runJobById`), and settled by `persistImmediateSubmit` (sync image jobs) or the minute crons `/api/cron/submit-jobs` and `/api/cron/refresh-jobs` (`src/service/generation/task-runner.ts`).
  - **Images** (`src/service/generation/image-backend.ts` → `src/service/openrouter/generate.ts`): Seedream and other stills go to OpenRouter `POST /api/v1/images`. Scene frames, locks, covers, realistic character boards, and life photos use `google/gemini-3-pro-image` (Nano Banana Pro) through Google AI Studio (`GOOGLE_API_KEY`, up to 14 inline references, 1K/2K). Illustrated character boards stay on `bytedance-seed/seedream-5-0-pro` (`bytedance-seed/seedream-5-0-lite` remains available). Responses are synchronous base64 data URLs uploaded to Vercel Blob (`persistMedia`). Never store raw multi-MB `data:` URLs in MongoDB `outputUrl` fields.
  - **Videos** (`src/service/generation/video-backend.ts` & `src/service/higgsfield/clip-keyframes.ts` → `src/service/openrouter/generate.ts`): Routed to OpenRouter `POST /api/v1/videos` with `frame_images` (`first_frame` / `last_frame`) and `generate_audio: true`. `realistic` styles use `minimax/hailuo-3` (`2K`, 7,000-char prompt limit enforced by `capOpenRouterVideoPrompt`, billed at 15 credits/s) because ByteDance Seedance rejects photorealistic human faces on OpenRouter; non-realistic styles use `bytedance/seedance-2.0-fast` (`720p`, billed at 9 credits/s). When `OPENROUTER_WEBHOOK_SECRET` is set and the app URL is public HTTPS, submit includes `callback_url` pointing at `POST /api/webhooks/openrouter` (HMAC `X-OpenRouter-Signature`). Status polling through `fetchOpenRouterStatus` (`GET /api/v1/videos/{id}`) remains the fallback.
  - **Testing Rule**: Never make live paid provider calls during unit tests; use pure functions or mock `fetch` (`{ fetch: fakeFetch }`).

