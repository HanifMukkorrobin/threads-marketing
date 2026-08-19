# Content Generation Engine Total Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Content Generation Engine to eliminate Mad-Libs template formulas, remove forced slang lists, enforce dynamic thread structures, strictly separate Pure Organic from Commercial Promos, and connect Organic Sourcing to an Obsidian Markdown Knowledge Vault.

**Architecture:** Split prompt building into two independent pipelines (Commercial Selling with dynamic prices/USPs vs Pure Educational with Zero Selling), replace sentence templates with tactical directives, and integrate `src/lib/knowledge-wiki.ts` for Obsidian note ingestion.

**Tech Stack:** Next.js 14 App Router, TypeScript, gray-matter (for YAML frontmatter parsing), Hermes AI Agent (`ag/gemini-3.6-flash-high`), Vitest.

**Spec:** [`docs/superpowers/specs/2026-08-18-content-generation-engine-overhaul.md`](file:///Users/tra-mac-020423/Documents/TraspacGitlab/research/threads-marketing/docs/superpowers/specs/2026-08-18-content-generation-engine-overhaul.md)

## Global Constraints

- Never break existing Prisma schema or truncate production catalogs.
- Zero forced slang lists (`gess`, `sat-set`, `boncos` list removed); tone is authentic practitioner.
- Pure Organic content (`productId === null`) MUST HAVE ZERO SALES PITCHES and zero mention of catalog prices.
- Banned starters: `"Banyak orang ngira..."`, `"Pernah gak sih..."`, `"Tahukah kamu..."`, `"Di era digital/modern ini..."`.
- All tests must pass sequentially with `npx vitest run --fileParallelism=false`.

---

### Task 1: Prompt Engine Overhaul & Angle Directive Refactor

**Files:**
- Modify: `src/lib/generation-engine.ts`
- Test: `tests/generation-engine.test.ts`

- [ ] **Step 1: Write failing unit tests for overhaul prompt rules**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Refactor `GENERATION_ANGLES` & rewrite `buildGenerationPrompt`**
- [ ] **Step 4: Run tests to verify pass**
- [ ] **Step 5: Commit changes**

---

### Task 2: Obsidian Knowledge Vault Engine (`src/lib/knowledge-wiki.ts`)

**Files:**
- Create: `src/lib/knowledge-wiki.ts`
- Create: `knowledge/ai-tools/prompt-engineering-framework.md`
- Create: `knowledge/productivity/deep-work-90-20-rule.md`
- Create: `knowledge/security/digital-tools-safety.md`
- Test: `tests/knowledge-wiki.test.ts`

- [ ] **Step 1: Write failing unit tests for Knowledge Vault parser & LRU topic selection**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement `src/lib/knowledge-wiki.ts` with frontmatter parsing**
- [ ] **Step 4: Create seed Obsidian markdown notes in `/knowledge`**
- [ ] **Step 5: Run tests to verify pass**
- [ ] **Step 6: Commit changes**

---

### Task 3: Organic Knowledge Topic Ingestion & Pure Value Synthesis

**Files:**
- Modify: `src/lib/generation-engine.ts`
- Test: `tests/generation-engine.test.ts`

- [ ] **Step 1: Add unit tests for generating thread from a Knowledge Topic**
- [ ] **Step 2: Connect Knowledge Vault loader into `generateDraftWithHermes` when `product === null`**
- [ ] **Step 3: Run tests to verify pass**
- [ ] **Step 4: Commit changes**

---

### Task 4: Background Cron Runner Multi-Stream Update

**Files:**
- Modify: `scripts/hermes-runner/hermes_mock_cron.ts`
- Test: `tests/hermes-runner.test.ts`

- [ ] **Step 1: Update runner to source organic threads from Knowledge Topics**
- [ ] **Step 2: Run tests to verify pass**
- [ ] **Step 3: Commit changes**

---

### Task 5: Full Test Suite Verification

- [ ] **Step 1: Run all tests sequentially with `npx vitest run --fileParallelism=false`**
- [ ] **Step 2: Verify zero failures across all test files**
- [ ] **Step 3: Update walkthrough artifact**
