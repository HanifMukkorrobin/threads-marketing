# Popup Modal Dialogs Architecture & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix layout fragmentation when popup dialogs open by implementing a React Portal system (`ModalPortal.tsx`), and refine the visual design of all modals to match the Neo-SaaS Bento Island aesthetic with sticky headers/footers and smooth scrolling.

**Architecture:** Create a client-side `ModalPortal` that mounts modals directly to `document.body` via `createPortal`, isolating them from ancestor CSS transforms and overflow rules. Refactor `CreateDraftModal`, `ProductModal`, and delete/action confirmation dialogs to use this portal with segmented tab modes and clean ergonomics.

**Tech Stack:** Next.js 14 (React 18), TypeScript, Tailwind CSS, Lucide Icons, React Portals (`createPortal`).

---

### Task 1: Create `ModalPortal.tsx` Primitive

**Files:**
- Create: `src/components/ModalPortal.tsx`

- [ ] Create `ModalPortal.tsx` with client-only mounting, `document.body` overflow scroll locking, ESC key listener, backdrop blur overlay, and animated content shell.

---

### Task 2: Refactor & Redesign `CreateDraftModal.tsx`

**Files:**
- Modify: `src/components/CreateDraftModal.tsx`

- [ ] Wrap modal inside `<ModalPortal>`.
- [ ] Implement a clean top segmented pill toggle: `[⚡ Hermes AI Generator]` vs `[✍️ Tulis Manual]`.
- [ ] Add sticky modal header with icon badge & close button.
- [ ] Add scrollable body container with custom scrollbar.
- [ ] Add sticky modal footer with `Batal` and action buttons.

---

### Task 3: Refactor & Redesign `ProductModal.tsx`

**Files:**
- Modify: `src/components/ProductModal.tsx`

- [ ] Wrap modal inside `<ModalPortal>`.
- [ ] Format inputs into cohesive Bento cards with sticky header and footer.
- [ ] Ensure price variants, category presets, and USP chips have comfortable padding and smooth scrolling.

---

### Task 4: Refactor Confirmation Dialogs across the App

**Files:**
- Modify: `src/app/drafts/page.tsx`
- Modify: `src/app/drafts/[id]/page.tsx`
- Modify: `src/components/ProductCard.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] Wrap delete draft modals, delete product modals, and regenerate key modals in `<ModalPortal>`.

---

### Task 5: Verification & Testing

**Files:**
- Run: `./node_modules/.bin/tsc --noEmit`
- Run: `./node_modules/.bin/vitest run --fileParallelism=false`

- [ ] Verify zero TypeScript errors.
- [ ] Verify all 123 tests pass.
- [ ] Check modal open/close behavior and visual viewport attachment.
