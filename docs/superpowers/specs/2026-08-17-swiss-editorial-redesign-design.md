# Design Specification: Swiss Editorial & Tactile Playful UI Redesign

**Date**: 2026-08-17  
**Project**: Threads Marketing Hub & AI Draft Manager  
**Design Direction**: Minimalist Swiss Editorial × Playful Tactile Micro-Interactions  
**Quality Standard**: `impeccable` Design Architecture & Zero AI Slop

---

## 1. Executive Summary & Goals
The goal of this design overhaul is to eliminate all generic "AI slop" patterns (gratuitous rainbow gradients, icon-stuffed bento boxes, glowing borders, pulsing beacons) and replace them with a bespoke, high-craft **Minimalist Swiss Editorial** aesthetic fused with **tactile, playful micro-interactions**.

### Core Tenet: 100% Feature Parity & Stability
- **Zero Functionality Lost**: Every API integration, form field, AI generation angle, AI Copilot natural language revision, PIN auth gate, database model, test case, and runner script remains fully intact and operational.
- **Zero Breaking API Changes**: All REST endpoints (`/api/drafts`, `/api/products`, `/api/settings`, `/api/overview`, `/api/auth/*`, `/api/hermes/*`) retain their exact schemas and responses.

---

## 2. Visual World & Design Tokens (Swiss Editorial System)

### A. Color Architecture
- **Base Background**: `#0A0A0A` (Deep neutral void, not blue-tinted)
- **Primary Card Surface**: `#121212` with razor-thin 1px border `#202020`
- **Elevated Surface / Dialogs**: `#161616` / `#1A1A1A`
- **Hover Surface**: `#1E1E1E`
- **Dividers & Hairlines**: `#222222` / `#282828`
- **Text Palette**:
  - Primary Text: `#F4F4F5` (Zinc 100, ultra high contrast)
  - Secondary Text: `#A1A1AA` (Zinc 400, crisp editorial subheads)
  - Muted / Meta Text: `#71717A` (Zinc 500)
  - Monospace Numbers: `#E4E4E7` (Zinc 200)

### B. Functional Editorial Accents
- **Primary Action (Threads Signature)**: High-contrast pure white `#FFFFFF` with `#000000` text, subtle shadow, and tactile micro-press.
- **Signal Emerald (Success / Approved / Active)**: `#10B981` (Crisp, restrained)
- **Swiss Vermilion (Alert / 500-Char Limit Warning)**: `#F59E0B` & `#EF4444`
- **Threads Sky (Live Posts / External Links)**: `#0095F6`

### C. Typographic Hierarchy & Tracking
- **Font Stack**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Headings (H1, H2, H3)**: Tight letter spacing (`tracking-[-0.03em]`), bold editorial weights (`font-bold` / `font-semibold`).
- **Body / Draft Text**: `leading-[1.6]` with relaxed readability for multi-paragraph threads.
- **Monospace Metadata**: `font-mono tracking-wider text-[11px] tabular-nums` for counters, IDs, endpoints, and character progress.

---

## 3. Playful & Tactile Micro-Interactions Specification

1. **Button & Card Physics**:
   - `transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1)`
   - Hover: subtle `-translate-y-0.5` lift + hairline border brightens to `#333333`.
   - Active / Tap: `scale-[0.97]` tactile press.
2. **Threads Simulator Dynamic Experience**:
   - **Like Heart Animation**: Spring bounce scale (`scale-125`) on click with smooth counter increment.
   - **Connected Line Glow**: Subtle brightness transition on the vertical thread line when hovering over respective posts.
   - **Character Limit Meter**: Fluid bar transition from emerald (`< 400 chars`) to amber (`400-500 chars`) to vermilion red (`> 500 chars`) with subtle pulse animation when over limit.
3. **Interactive Segmented Controls & TABS**:
   - Smooth active indicator highlighting selected tab with crisp contrast.
4. **Copy-to-Clipboard & Quick Actions**:
   - Animated morphing checkmark with tactile pill background transition.
5. **PIN Lockpad Tactile Interaction**:
   - Keypad button spring feedback, 6-digit box focus ring glow, and smooth shake animation on incorrect PIN.

---

## 4. Surface-by-Surface Overhaul Plan

### 1. Navigation Shell (`src/components/Navbar.tsx`)
- Minimalist Swiss bar with clean wordmark `"Threads Engine"`, micro engine status indicator, and quick-lock button.
- Clean mobile drawer navigation with smooth slide-down physics.

### 2. Dashboard Overview (`src/app/page.tsx`)
- Hero metric summary with clean typographic numbers and hairline borders.
- Hermes Connection Hub with 1-click CLI runner copy tool.
- Quick Triage Review Queue featuring high-scannability editorial draft preview and 1-click approve button.

### 3. Drafts Queue & Triage (`src/app/drafts/page.tsx` & `src/components/DraftCard.tsx`)
- Segmented status tabs (`Semua`, `Menunggu Review`, `Approved`, `Dijadwalkan`, `Terpublikasi`, `Gagal`).
- Product filter dropdown & search bar with instant responsive filtering.
- `DraftCard` with clean typography, expand/collapse thread drawer, and quick status actions.

### 4. Interactive Draft Editor & Threads Simulator (`src/app/drafts/[id]/page.tsx` & `src/components/ThreadPartEditor.tsx`, `ThreadsPreview.tsx`)
- Side-by-side balanced workspace: Left column editor with per-post character counters and AI Copilot quick prompts; Right column sticky Threads Simulator.
- Simulator supports instant mobile vs. desktop feed preview modes and interactive like/repost actions.

### 5. Product Catalog (`src/app/products/page.tsx` & `src/components/ProductCard.tsx`, `ProductModal.tsx`)
- Clean grid cards showing dynamic pricing variants (IDR formatted), USP badges, tone of voice, and quick toggle switch.
- Structured modal for editing and adding products with dynamic variant and USP tag managers.

### 6. Settings & Integration Hub (`src/app/settings/page.tsx`)
- Modular tabbed settings: Store Branding (`STORE_NAME`, `@STORE_USERNAME`), Hermes API Token, Threads API Token, and Security PIN Management.
- Integrated interactive API testing console and curl/python/typescript code generation.

### 7. PIN Lockscreen (`src/app/login/page.tsx`)
- Minimalist Swiss security shield with 6 discrete digit inputs, show/hide PIN toggle, and tactile on-screen keypad for touch devices.

---

## 5. Verification & Test Suite
- Run all 12 Vitest suites (`npm test`) covering API routes, draft manipulation, revision engine, and PIN authentication to verify 100% test pass rate.
- Run Next.js production build (`npm run build`) to ensure zero TypeScript or bundling errors.
