# Design Specification: Neo-SaaS Bento Island UI Redesign

## 1. Overview & Visual Identity
This specification defines the complete UI redesign of the **Threads Marketing Engine Studio** into the **Neo-SaaS Bento Island** design aesthetic as requested, directly inspired by high-end modern interfaces (Amie, Linear, Make.com, Raycast).

### Visual Metaphor & Anatomy:
- **Outer Canvas**: Soft Sage / Light Neutral (`#E3E9E5` / `#DCE3DE`).
- **Sidebar Dock**: Pitch Black vertical pill dock (`#121214`, `rounded-[28px]`) with discrete circular icon buttons, active status pills, and user avatar.
- **Main Floating Island**: Pure White (`#FFFFFF`) with ultra-smooth corners (`rounded-[36px]`), subtle ambient drop shadows, and generous padding (`p-8` to `p-10`).
- **Accent Highlighting**: Vibrant **Electric Lime / Neon Chartreuse** (`#E2FD52`) for highlight bento cards, status badges, and battery capacity dots.
- **Card Containers**: Soft Cream / Light Neutral (`#F4F6F5` / `#ECEFEF`) and Pitch Black (`#121214`) for dark action cards with `rounded-[24px]` to `rounded-[32px]`.
- **Inline Sticker Headings**: Expressive typography with inline emoji / badge stickers (e.g. `Managing ✦ Your Content and ⚡ Marketing Engine`).

---

## 2. Token System (`tailwind.config.ts` & `globals.css`)

### Color Tokens:
```typescript
colors: {
  canvas: '#E3E9E5',          // Soft Sage outer canvas
  island: '#FFFFFF',          // Main white island
  dock: '#121214',            // Pitch black sidebar dock
  surface: '#F4F6F5',         // Soft neutral card surface
  surfaceMuted: '#ECEFEF',    // Muted surface / borders
  lime: {
    DEFAULT: '#E2FD52',       // Electric lime accent
    hover: '#D4F63D',
    light: '#F5FED4',
    dark: '#9BB811',
  },
  ink: {
    DEFAULT: '#121214',       // Pitch black text
    secondary: '#646A72',     // Slate muted text
    muted: '#9DA3AE',         // Light placeholder text
  }
}
```

### Radius & Motion Tokens:
- Island Radius: `rounded-[36px]`
- Card Radius: `rounded-[28px]`
- Button/Pill Radius: `rounded-full` (capsule)
- Spring Physics: `cubic-bezier(0.16, 1, 0.3, 1)` with `active:scale-[0.96]` tactile feedback.

---

## 3. Structural Layout & Navigation

### Left Vertical Sidebar Dock (`src/components/SidebarDock.tsx`):
- Persistent vertical pill dock on the left of the viewport.
- Top: Circular `+` button (Quick Create Draft modal).
- Middle Navigation:
  - 🏠 Dashboard (`/`)
  - 🧵 Drafts Hub (`/drafts`)
  - 📦 Products (`/products`)
  - ⚙️ Settings (`/settings`)
- Bottom Actions:
  - 🚀 Hermes Agent Runner quick trigger / status
  - 🔒 Quick PIN lock screen shortcut
  - 👤 User avatar bubble with connection status dot

### Main Floating Island (`src/components/IslandLayout.tsx`):
- Wraps all page content inside a responsive white island.
- Top Header: Expressive Headline with inline badges + Right Action Bar (Settings shortcut + `+ Create New Draft` black pill button).
- Segmented Pill Filter Bar (`Semua`, `Pending`, `Approved`, `Published`, etc.) as interactive smooth pill chips.

---

## 4. Key Page Layouts

### 1. Dashboard Overview (`src/app/page.tsx`):
- **Bento Metric Grid**:
  - `Operations / Drafts KPI Card`: Soft gray (`#F4F6F5`), circular category badge icon, large bold tabular metric with percentage pill (`82% ◯`), and battery capacity dot progress meter (`●●●●●●○○○○`).
  - `Approved Queue / Active Card`: **Electric Lime Card (`#E2FD52`)**, dark text, bold metric (`163 / 512.0 MB` or `12 Drafts Ready`), percentage badge (`68% ◯`), and matching black dot battery meter.
  - `Hermes Autonomous Engine Hero Banner`: Pitch black card (`#121214`), white headline with inline diagonal arrow (`Take Your Automation ↗ to the Next Level`), 3D visual graphic, and white pill CTA (`Run Agent ▷`).
- **Statistics & Live Schedule Visualizer**:
  - Capsule-pill double bar chart visualization for publishing schedule and draft activity.
- **Quick Action & Triage Directory**:
  - Clean card grid for fast approvals, product catalog quick links, and API tester.

### 2. Content Drafts Hub (`src/app/drafts/page.tsx` & `DraftCard.tsx`):
- Top Segmented Pills (`Semua`, `Menunggu Review`, `Disetujui`, `Terbit`, `Gagal`).
- Bento Draft Cards with battery capacity status, thread chain preview, and 1-click approve button.

### 3. Deep-Focus Thread Editor & Simulator (`src/app/drafts/[id]/page.tsx`):
- Left Side: Clean white frame Threads mobile feed simulator with interactive heart pop and connected thread line.
- Right Side: Bento Post Editor with fluid character meters, image attachments, and AI Copilot quick prompt chips.

### 4. Products Catalog (`src/app/products/page.tsx`, `ProductCard.tsx`, `ProductModal.tsx`):
- Bento Product Cards with IDR price tags, USP chips, and electric lime active toggles.
- Modal with dynamic variant rows and USP tag manager.

### 5. Settings Hub (`src/app/settings/page.tsx`):
- Tabbed bento cards for Hermes API Auth, Meta Threads Graph API token, PIN access, and interactive live latency tester.

### 6. PIN Lock Screen (`src/app/login/page.tsx`):
- Soft sage canvas with central white security island, 6 discrete PIN boxes, and smooth virtual keypad.

---

## 5. Non-Negotiable Constraints & Functionality Parity
- All backend REST APIs, Prisma SQLite schemas (`Product`, `ContentDraft`, `DraftPostItem`, `SystemConfig`), and form handlers remain 100% operational.
- Zero AI-slop: No generic Lucide icons dropped in default un-styled sizes; all icons are embedded in dedicated circular/pill micro-containers or inline badge stickers.
