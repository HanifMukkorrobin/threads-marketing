# Swiss Editorial & Tactile Playful UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire Threads Marketing Hub web application into a Minimalist Swiss Editorial aesthetic with tactile playful micro-interactions, adhering strictly to `impeccable` design standards, eliminating all AI slop, while preserving 100% of existing functionality, forms, and APIs.

**Architecture:** Update foundational tokens in `tailwind.config.ts` and `globals.css` (custom animation easings, hairline borders, Swiss monochrome palette). Refactor all UI components (`Navbar`, `DraftStatusBadge`, `DraftCard`, `ProductCard`, `ThreadsPreview`, `ThreadPartEditor`, `CreateDraftModal`, `ProductModal`) and all pages (`/`, `/drafts`, `/drafts/[id]`, `/products`, `/settings`, `/login`) to use the new aesthetic and interactive micro-animations. Verify full test suite passes.

**Tech Stack:** Next.js 14 App Router, TypeScript, React 18, Tailwind CSS, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-17-swiss-editorial-redesign-design.md`

## Global Constraints
- Every API endpoint and backend function must remain 100% intact with zero breaking schema changes.
- All form inputs, modal states, CRUD handlers, AI Copilot prompt revisions, and PIN authentication must remain 100% operational.
- Strict adherence to `DESIGN.md` and `PRODUCT.md` standards: zero generic purple gradients, zero nested card clutter, zero icon overload.

---

### Task 1: Foundations — Design Tokens, Typography & Micro-Animation System
**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `DESIGN.md`

- [x] **Step 1: Update `tailwind.config.ts` with Swiss Editorial palette & tactile animation tokens**
  - Add refined neutral palette (`#0A0A0A`, `#121212`, `#161616`, `#1E1E1E`, `#222222`).
  - Add cubic-bezier spring physics timing curves.
- [x] **Step 2: Update `src/app/globals.css` with sleek dark scrollbars, keyframe spring animations, and typography reset**
  - Include `@keyframes pop`, `@keyframes slideUp`, `@keyframes shake`, and clean monochrome selections.
- [x] **Step 3: Update `DESIGN.md` to reflect Swiss Editorial × Playful Tactile Design System**

---

### Task 2: Layout & Navigation Shell (`Navbar` & `RootLayout`)
**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/app/layout.tsx`

- [x] **Step 1: Redesign `Navbar.tsx` with Swiss typographic branding**
  - Clean `Threads Engine` typographic logo with active engine indicator.
  - Tactile navigation pills with subtle active indicator.
  - Sleek lock button and mobile drawer with smooth slide physics.
- [x] **Step 2: Verify `RootLayout` has proper background & font smoothing**

---

### Task 3: Core Status Badges & Reusable Atoms (`DraftStatusBadge`)
**Files:**
- Modify: `src/components/DraftStatusBadge.tsx`

- [x] **Step 1: Redesign `DraftStatusBadge.tsx` with minimalist Swiss editorial styling**
  - Crisp micro-pills with restrained signal accents (Emerald for Approved, Amber for Pending Review, Rose for Failed, Sky for Published).
  - High scannability and clean typography.

---

### Task 4: Dashboard Overview Page (`/`) & Quick Triage Queue
**Files:**
- Modify: `src/app/page.tsx`

- [x] **Step 1: Redesign Metric Cards with clean Swiss numbers and hairline dividers**
  - Large tabular figures, subtle border highlights on hover, and clear editorial hierarchy.
- [x] **Step 2: Elevate Hermes Hub Status Banner**
  - 1-Click CLI runner copy button with spring checkmark animation.
- [x] **Step 3: Redesign Triage Review Queue Cards**
  - Editorial thread card presentation with quick-approve micro-button and toast notifications.

---

### Task 5: Content Drafts Hub (`/drafts`) & `DraftCard` Component
**Files:**
- Modify: `src/components/DraftCard.tsx`
- Modify: `src/app/drafts/page.tsx`

- [x] **Step 1: Redesign `DraftCard.tsx`**
  - Clear editorial layout, smooth multi-post expand/collapse accordion, clean action buttons, live link badge.
- [x] **Step 2: Redesign `src/app/drafts/page.tsx`**
  - Segmented tactile tab filters with count indicators, search bar, product filter dropdown, and delete confirmation dialog.

---

### Task 6: Interactive Live Threads Simulator & Post Editor (`/drafts/[id]`)
**Files:**
- Modify: `src/components/ThreadsPreview.tsx`
- Modify: `src/components/ThreadPartEditor.tsx`
- Modify: `src/app/drafts/[id]/page.tsx`

- [x] **Step 1: Redesign `ThreadsPreview.tsx` (Live Simulator)**
  - Authentic mobile frame with dynamic island mockup and web feed toggle.
  - Interactive like button with spring bounce pop animation and active counter.
  - Connected thread vertical line with hover brightness response.
- [x] **Step 2: Redesign `ThreadPartEditor.tsx`**
  - Fluid character meter bar (green -> amber -> red) with live counter and image attachment manager.
- [x] **Step 3: Redesign `src/app/drafts/[id]/page.tsx`**
  - Side-by-side balanced split layout, AI Copilot prompt chips with quick-fill interaction, Save/Approve/Delete header bar.

---

### Task 7: Product Catalog Management (`/products` & `ProductCard`, `ProductModal`)
**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/ProductModal.tsx`
- Modify: `src/app/products/page.tsx`

- [x] **Step 1: Redesign `ProductCard.tsx`**
  - Minimalist Swiss product cards with IDR pricing tags, USP badges, tactile active toggle, and copy AI context button.
- [x] **Step 2: Redesign `ProductModal.tsx`**
  - Clean modular modal with dynamic variant and USP tag manager.
- [x] **Step 3: Redesign `src/app/products/page.tsx`**
  - Category filters, search, and empty state presentation.

---

### Task 8: Settings & Integration Console (`/settings`)
**Files:**
- Modify: `src/app/settings/page.tsx`

- [x] **Step 1: Refactor and Redesign `src/app/settings/page.tsx`**
  - Modular tabbed sections: Store Profile Branding, Hermes API Token & CLI commands, Threads API integration, Security PIN management.
  - Integrated interactive API testing console with live latency meter and code generation tabs (curl / python / ts).

---

### Task 9: PIN Lock Screen (`/login`)
**Files:**
- Modify: `src/app/login/page.tsx`

- [x] **Step 1: Redesign `src/app/login/page.tsx`**
  - Swiss minimalist lock card with 6 discrete tactile PIN boxes.
  - Interactive on-screen keypad with spring click animation and shake error effect.

---

### Task 10: Create Draft Modal (`CreateDraftModal`)
**Files:**
- Modify: `src/components/CreateDraftModal.tsx`

- [x] **Step 1: Redesign `CreateDraftModal.tsx`**
  - Hermes AI Generator Angle selector with clean editorial cards and manual multi-post editor.

---

### Task 11: Verification & Code Review
- [x] **Step 1: Verify all component props, handlers, form states, and API endpoints are 100% intact**
- [x] **Step 2: Impeccable frontend design standards validation**
