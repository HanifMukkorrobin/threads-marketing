# AI Draft Revision Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an interactive 1-click AI revision automation feature allowing users to provide natural language feedback (e.g. "ubah post 3 menjadi blablabla", "bikin hook lebih santai") and instantly re-generate or modify thread parts adhering to `/ecommerce-copy-humanizer-id`.

**Architecture:** Next.js App Router with a dedicated Revision Engine (`src/lib/revision-engine.ts`), API Route (`/api/drafts/[id]/revise`), and an interactive revision UI widget with quick-prompt presets embedded in the Thread Editor (`src/app/drafts/[id]/page.tsx`).

**Tech Stack:** TypeScript, Next.js 14 App Router, Prisma ORM, Tailwind CSS, Lucide Icons, Vitest.

---

### Task 1: AI Revision Engine Core Logic (`src/lib/revision-engine.ts`)
- Build rule-based and intent-aware revision parser and transformer that applies humanized Indonesian ecommerce copy guidelines.
- Handle whole-thread revisions and targeted post-by-post revisions (e.g. "ubah post 3...", "ganti hook...").
- Keep under 500 characters per post.
- Test suite: `tests/revision-engine.test.ts`.

### Task 2: API Route for AI Revision (`src/app/api/drafts/[id]/revise/route.ts`)
- Implement `POST /api/drafts/[id]/revise`.
- Fetch draft and product context, execute revision engine, return updated thread posts and status.
- Support both live editor preview and database save.

### Task 3: Interactive Revision UI Component in Thread Editor (`src/app/drafts/[id]/page.tsx`)
- Add "✨ Minta Revisi AI" interactive panel with prompt input, quick preset chips, and target part selector.
- Connect to `/api/drafts/[id]/revise` with instant state update in editor & Threads live preview simulator.
- Add success toasts and error handling.

### Task 4: End-to-End Verification & PM2 Production Deployment
- Run all vitest test suites.
- Build Next.js production bundle.
- Restart PM2 daemon and verify live on port 4000.
