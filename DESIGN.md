# DESIGN.md: Visual World & Design System

## 1. Visual World: "Threads Precision & Modern Commerce"
- **Inspiration**: Native Threads app aesthetic (deep blacks, warm dark grays, crisp micro-borders, clean sans-serif typography, tactile interactive states).
- **Theme**: Dark-first palette (`#101010` background, `#181818` card surfaces, `#262626` borders, `#F3F5F7` primary text, `#777777` secondary text, `#0095F6` primary accent blue, `#00BA7C` success green, `#F45D22` amber alert, `#FF3040` error red).

## 2. Typography & Spatial Rhythm
- **Font Stack**: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Scale**:
  - Headings: Crisp semi-bold/bold, tight tracking (`-0.02em` to `-0.03em`).
  - Body: 14px/15px with relaxed line-height (1.5 - 1.6) for optimal readability.
  - Numbers & Counters: Monospace / Tabular figures for character counts (`120 / 500`).
- **Spacing**: 8px grid system (4px, 8px, 12px, 16px, 24px, 32px).

## 3. Component Craft Floor
- **Card Containers**: `#181818` background, 1px solid `#262626` border, subtle 12px border radius.
- **Buttons**:
  - Primary: High-contrast white/light button with black text (`#F3F5F7` bg, `#000` text) or `#0095F6` accent for key actions.
  - Secondary/Ghost: Transparent with subtle `#282828` border, hover to `#222222`.
  - Danger: `#FF3040` subtle tint.
- **Threads Live Simulator**:
  - Exact Threads mobile frame proportions.
  - Authentic connected line linking thread post 1 to post N.
  - Live character countdown indicator (Green < 400, Amber 400-500, Red > 500 with warning).
- **Anti-patterns Banned**:
  - No purple-on-dark, no glowing halos, no gratuitous gradients, no nested card clutter, no cliché biscuit pills.
