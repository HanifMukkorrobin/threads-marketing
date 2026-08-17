# Project Guidelines & Superpowers Protocol

## Superpowers Protocol Enforcement

Always strictly follow the **Superpowers** workflow and discipline (`superpowers:using-superpowers`) on every session and task in this project:

1. **Invoke Skills Before Any Action**:
   - Before taking action, writing code, exploring the codebase, or asking clarifying questions, check available skills and invoke the relevant one.
   - Announce `"Using [skill] to [purpose]"` and follow the skill instructions precisely.

2. **Skill Priority & Workflow**:
   - **New Features / UI / Functionality**: Invoke `superpowers:brainstorming` first to explore requirements and design before jumping into implementation or plans.
   - **Planning**: After brainstorming or receiving a clear specification, invoke `superpowers:writing-plans`.
   - **Execution**: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
   - **Bug Fixes / Issues**: Always invoke `superpowers:systematic-debugging` before proposing fixes.
   - **Implementation**: Follow `superpowers:test-driven-development` when writing features or bugfixes.
   - **Completion & Verification**: Invoke `superpowers:verification-before-completion` before claiming work is finished.

3. **Task Tracking**:
   - Maintain a task artifact markdown checklist for multi-step tasks and keep it updated throughout execution.

---

# AI Agent Architecture & Developer Guide

## 1. Project Overview & Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript & React 18
- **Styling**: Tailwind CSS & Lucide Icons (Dark Theme, Threads-authentic aesthetics)
- **Database**: SQLite via Prisma ORM (`prod.db` for production, `dev.db` for dev, `test.db` for Vitest)
- **Runtime / Process Manager**: PM2 (`threads-marketing` cluster/fork mode on port 4000)
- **External Agent**: Hermes Autonomous Agent (Python 3 & TypeScript runners integrated with Hermes Gateway CLI scheduler)

---

## 2. Database Multi-Environment Isolation Protocol
To prevent automated unit tests from truncating or resetting live production product catalogs, the database is strictly separated:
- **Production Server (`PM2`)**: Configured with `DATABASE_URL="file:./prod.db"`.
- **Vitest Unit & API Tests**: Configured in `vitest.config.ts` with `DATABASE_URL="file:./test.db"`.
- **Local Dev / Seeds**: Uses `dev.db` or `prod.db`.

---

## 3. Hermes AI Copywriting & Skill Guidelines
Hermes Agent uses the **`ecommerce-copy-humanizer-id`** copywriting standard:
- **Natural, Casual Indonesian**: Authentic slang (`gess`, `sat-set`, `boncos`, `worth it`, `nugas`), balanced without cringe, strictly avoiding robotic stiff translation phrasing.
- **500 Character Limit**: Every single thread post must be under 500 characters.
- **Multi-Part Structure**:
  - **Post 1 (Hook)**: Engaging problem, relate/curhat question, or curiosity gap.
  - **Post 2 (Value / Product Proof)**: Dynamic USP list, real package pricing, and benefit comparisons.
  - **Post 3 (Action / CTA)**: Soft or hard CTA referencing the store's handle (e.g. `@hades.zshrc`) and ordering instructions.

### Content Generation Archetypes:
1. **Product Promo Drafts**:
   - `Storytelling & Curhat Relate`
   - `Solusi Cerdas & Anti-Boncos`
   - `Productivity & Feature Hack`
   - `FOMO & Slot Terbatas`
2. **Organic / Non-Product Drafts (`productId: null`)**:
   - `Edukasi & Produktivitas`
   - `Tech & AI Insights`
   - `Storytelling & Curhat Relate`
   - `Rekomendasi Tools Digital`

---

## 4. AI Copilot Revision Engine (Option A)
The system includes an interactive in-editor Copilot engine (`src/lib/revision-engine.ts` and `POST /api/drafts/[id]/revise`):
- **Natural Language Parsing**: Automatically detects targeted parts (e.g. `"ubah post 3..."`, `"ganti hook..."`, `"tambah varian harga"`) or whole-thread tone shift (`"bikin lebih santai"`, `"bikin gaya fomo"`).
- **Dynamic Store Branding**: Injects `STORE_NAME` and `STORE_USERNAME` from `SystemConfig` into generated revisions.
- **Preview & AutoSave**: Supports testing revisions live with instant Threads Simulator update, and optional direct persistence.

---

## 5. Hermes Gateway Scheduler (`hermes cron`)
Scheduled tasks are registered directly into the **Hermes Gateway Service** (`hermes cron`):
- **`threads-marketing-post`** (`every 1m`): Fetches `APPROVED` drafts from `/api/hermes/drafts/approved` and publishes to Threads.
- **`threads-marketing-generate`** (`every 120m`): Fetches active products and store info from `/api/hermes/products/active`, generating both product promos and organic threads to `/api/hermes/drafts`.
- **Helper Scripts**: Located in `~/.hermes/scripts/threads_marketing_post.py` and `~/.hermes/scripts/threads_marketing_generate.py`.

---

## 6. Key REST Endpoints

### Store Admin & UI APIs:
- `GET, POST /api/products`: Manage product catalog
- `GET, PUT, DELETE /api/products/[id]`: Product details, update, delete
- `GET, POST /api/drafts`: Query and create content drafts
- `GET, PATCH, DELETE /api/drafts/[id]`: Draft inspection, multi-part post edits, approvals
- `POST /api/drafts/[id]/revise`: AI Copilot natural language revision
- `GET, POST /api/settings`: Read and update system configurations & store branding
- `GET /api/overview`: Aggregated analytics and queue KPIs

### Hermes Autonomous Agent APIs (`Authorization: Bearer <API_KEY>`):
- `GET /api/hermes/products/active`: Fetch active products and store profile
- `POST /api/hermes/drafts`: Autonomous draft creation (status: `PENDING_REVIEW`)
- `GET /api/hermes/drafts/approved`: Fetch queue of user-approved drafts ready for posting
- `PATCH /api/hermes/drafts/[id]/status`: Update draft status to `PUBLISHED` with post ID & live URL

---

## 7. Verification & Build Commands
- Run test suite: `npm test`
- Build production bundle: `npm run build`
- Restart production process: `npm run pm2:restart`
- Verify Hermes cron: `hermes cron status` and `hermes cron list`
