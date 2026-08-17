# Neo-SaaS Bento Island UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Threads Marketing Hub into a high-end **Neo-SaaS Bento Island** aesthetic (Soft Sage canvas, Pitch Black left sidebar dock, Pure White floating island `rounded-[36px]`, Electric Lime `#E2FD52` accents, headline sticker badges, battery capacity dots, and smooth capsule pills), eliminating AI slop while keeping 100% of existing functionality intact.

**Architecture:** Update tokens in `tailwind.config.ts` and `globals.css` for canvas `#E3E9E5`, dock `#121214`, lime `#E2FD52`, and surface `#F4F6F5`. Create structural dock shell `SidebarDock.tsx` and container wrapper `IslandLayout.tsx`. Refactor all pages (`/`, `/drafts`, `/drafts/[id]`, `/products`, `/settings`, `/login`) and modals (`CreateDraftModal`, `ProductModal`).

**Tech Stack:** Next.js 14 App Router, TypeScript, React 18, Tailwind CSS, Lucide React (styled in custom circular micro-badges).

**Spec:** `docs/superpowers/specs/2026-08-17-neo-saas-bento-island-design.md`

## Global Constraints
- Every API endpoint and backend function must remain 100% intact with zero breaking schema changes.
- All form inputs, modal states, CRUD handlers, AI Copilot prompt revisions, and PIN authentication must remain 100% operational.
- No heavy commands or production builds (respecting user instruction).

---

### Task 1: Design Tokens & Base Theme Setup
**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Configure Neo-SaaS Bento Island Palette & Radius in `tailwind.config.ts`**
  - Add `canvas` (`#E3E9E5`), `dock` (`#121214`), `island` (`#FFFFFF`), `surface` (`#F4F6F5`), `lime` (`#E2FD52`), `ink` (`#121214`).
  - Add ultra-rounded border radius tokens (`rounded-island`: `36px`, `rounded-card`: `28px`).
- [ ] **Step 2: Update `src/app/globals.css` with soft canvas background and smooth scrollbar**

---

### Task 2: Layout Shell — Left Vertical Sidebar Dock & Floating White Island Wrapper
**Files:**
- Create: `src/components/SidebarDock.tsx`
- Create: `src/components/IslandLayout.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `SidebarDock.tsx`**
  - Left vertical pitch black pill dock (`#121214`, `rounded-[28px]`).
  - Top `+` quick draft button, middle navigation icons (Dashboard, Drafts Hub, Products, Settings), bottom Hermes status and PIN lock shortcuts.
- [ ] **Step 2: Create `IslandLayout.tsx`**
  - Responsive wrapper with Soft Sage background (`#E3E9E5`), persistent sidebar dock, and Pure White floating island (`rounded-[36px]` or full on mobile).
- [ ] **Step 3: Update `src/app/layout.tsx` to mount the layout shell**

---

### Task 3: Status Atoms & Sticker Badges (`DraftStatusBadge` & Header Stickers)
**Files:**
- Modify: `src/components/DraftStatusBadge.tsx`

- [ ] **Step 1: Redesign `DraftStatusBadge.tsx` with smooth capsule pill styling**
  - Approved: Electric Lime / Emerald capsule.
  - Pending: Amber / Muted warm capsule.
  - Published: Sky / Jet black capsule.
  - Battery capacity dot component for draft parts.

---

### Task 4: Dashboard Overview (`/`) — Neo-SaaS Bento Island Redesign
**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Expressive Headline with Inline Badges**
  - `Managing ✦ Your Content and ⚡ Marketing Engine` + Right action buttons (Settings gear + `+ Create Draft` black capsule).
- [ ] **Step 2: Bento Metric Cards**
  - Card 1 (`#F4F6F5`): `Operations / Drafts` with percentage badge and battery dots.
  - Card 2 (`#E2FD52`): `Approved Queue` with dark text, percentage badge, and black battery dots.
  - Card 3 (`#121214`): `Hermes Autonomous Engine` hero banner with 3D artwork and `Run Agent ▷` white pill CTA.
- [ ] **Step 3: Interactive Statistics & Capsule Bar Schedule Chart**
- [ ] **Step 4: Triage Review Queue & Fast Action Directory**

---

### Task 5: Content Drafts Hub (`/drafts` & `DraftCard.tsx`)
**Files:**
- Modify: `src/components/DraftCard.tsx`
- Modify: `src/app/drafts/page.tsx`

- [ ] **Step 1: Redesign `DraftCard.tsx` as Bento Cards with battery dots, clean thread accordion, and capsule approve button**
- [ ] **Step 2: Redesign `src/app/drafts/page.tsx` with horizontal pill tab filters (`Semua`, `Menunggu Review`, `Disetujui`, `Terbit`) and search bar**

---

### Task 6: Threads Simulator & Deep Post Editor (`/drafts/[id]`)
**Files:**
- Modify: `src/components/ThreadsPreview.tsx`
- Modify: `src/components/ThreadPartEditor.tsx`
- Modify: `src/app/drafts/[id]/page.tsx`

- [ ] **Step 1: Redesign `ThreadsPreview.tsx` in clean white device frame with interactive like bounce pop**
- [ ] **Step 2: Redesign `ThreadPartEditor.tsx` with capsule character counters and image attachment support**
- [ ] **Step 3: Redesign `src/app/drafts/[id]/page.tsx` with AI Copilot chip suggestions and capsule action bar**

---

### Task 7: Product Catalog (`/products`, `ProductCard.tsx`, `ProductModal.tsx`)
**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/components/ProductModal.tsx`
- Modify: `src/app/products/page.tsx`

- [ ] **Step 1: Redesign `ProductCard.tsx` with IDR pricing tags, USP pills, and Electric Lime active toggle**
- [ ] **Step 2: Redesign `ProductModal.tsx` with Bento sections and variant pricing manager**
- [ ] **Step 3: Redesign `src/app/products/page.tsx` with category filter pills and Bento grid**

---

### Task 8: Settings Hub & REST Tester (`/settings`)
**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Redesign `src/app/settings/page.tsx` with tabbed Bento cards for Hermes API, Meta Graph API, PIN Security, and Interactive Tester**

---

### Task 9: PIN Lock Screen (`/login`)
**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Redesign `src/app/login/page.tsx` with Sage canvas, White Security Island, 6 discrete PIN boxes, and smooth tactile keypad**

---

### Task 10: Create Draft Modal (`CreateDraftModal.tsx`)
**Files:**
- Modify: `src/components/CreateDraftModal.tsx`

- [ ] **Step 1: Redesign `CreateDraftModal.tsx` with Angle Bento Cards and capsule buttons**

---

### Task 11: Verification & Code Review
- [ ] **Step 1: Verify all component props, handlers, form states, and API endpoints are 100% intact**
- [ ] **Step 2: Impeccable frontend design standards validation**
