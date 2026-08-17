# DESIGN.md: Visual World & Design System

## 1. Visual World: "Minimalist Swiss Editorial × Playful Tactile Motion"
- **Inspiration**: Minimalist Swiss Editorial grid design fused with authentic Meta Threads typography and tactile physical micro-interactions.
- **Theme**: Neutral deep black (`#0A0A0A` background, `#121212` card surfaces, `#181818` elevated surfaces, `#222222` hairline borders, `#333333` active borders, `#F4F4F5` primary text, `#A1A1AA` secondary text, `#71717A` muted text, `#0095F6` primary accent blue, `#10B981` success emerald, `#F59E0B` amber alert, `#EF4444` error vermilion).

## 2. Typography & Spatial Rhythm
- **Font Stack**: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Scale & Tracking**:
  - Headings: Crisp bold / semi-bold with tight tracking (`-0.025em` to `-0.035em`).
  - Body: 14px/15px with relaxed line-height (1.6) for optimal editorial thread reading.
  - Numbers & Counters: Monospace / Tabular figures (`font-mono tabular-nums text-xs`) for character counts (`120 / 500`).
- **Spacing**: 8px grid system with hairline 1px dividers.

## 3. Tactile Micro-Interactions & Component Craft Floor
- **Card Containers**: `#121212` background, 1px solid `#222222` border, subtle 12px border radius, smooth hover lift (`-translate-y-0.5`).
- **Buttons**:
  - Primary: High-contrast pure white button with crisp black text (`#F4F4F5` bg, `#000` text) with spring click effect (`active:scale-[0.97]`).
  - Secondary: `#181818` surface with subtle `#222222` border, hover to `#262626`.
  - Danger: `#EF4444` with subtle tint.
- **Threads Live Simulator**:
  - Authentic Threads mobile frame and web feed modes.
  - Connected vertical thread line with hover glow.
  - Interactive Like heart with spring pop animation (`pop 0.25s`) and live counter.
  - Fluid character countdown indicator (Green < 400, Amber 400-500, Red > 500 with warning).
- **Anti-patterns Banned**:
  - Zero purple-on-dark gradients, zero glowing colored outlines, zero icon-stuffed bento clutter, zero nested card boxes, zero gratuitous pulsing pills.

