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
- **Runtime / Process Manager**: PM2 (`threads-marketing` cluster mode on port 4000)
- **External Agent**: Hermes Autonomous Agent (Python 3 & TypeScript runners integrated with Hermes Gateway CLI scheduler)
- **Domain & Reverse Proxy**: `https://threads.hadestech.web.id` -> Nginx -> `http://127.0.0.1:4000` (Cloudflare SSL)

---

## 2. Dual-Environment Directory & Git Branching Protocol
To ensure 100% stability, zero downtime, and complete isolation between live traffic and feature development, the codebase and server are strictly partitioned into two separate directories and branches under repository `git@github.com:HanifMukkorrobin/threads-marketing.git`:

### 🛠️ A. Development Environment (`/home/ubuntu/project/threads-marketing`)
- **Git Branch**: `dev` (`origin/dev`)
- **Work Scope**: **ALL** coding, feature creation, bug fixing, experimentation, refactoring, and automated testing must occur in this directory.
- **Database**: `prisma/dev.db` for local dev server, and `prisma/test.db` for Vitest test runs.
- **Port**: Local dev server on port `3000` (`npm run dev`).
- **Strict Rule**: NEVER run PM2 production cluster from this directory or overwrite live `prod.db`.

### 🚀 B. Production Environment (`/home/ubuntu/production/threads-marketing`)
- **Git Branch**: `main` (`origin/main`)
- **Work Scope**: Serves the live production web app and Hermes Autonomous Agent background schedulers.
- **Database**: `prisma/prod.db` (stores live product catalogs, approved queues, settings, and revision history).
- **Process Manager**: PM2 process `threads-marketing` running Next.js production server on port `4000`.
- **Hermes Cron**: `~/.hermes/scripts/threads_marketing_*.py` points exclusively to this directory.
- **Deployment Protocol**:
  1. Complete and verify work on `dev` branch in `/home/ubuntu/project/threads-marketing`.
  2. Run `npm test` and ensure all tests pass.
  3. Push to GitHub `dev` (`git push origin dev`) and merge into `main` (via PR or `git merge`).
  4. In `/home/ubuntu/production/threads-marketing`, deploy via:
     ```bash
     git pull origin main
     npm run build
     npm run pm2:restart
     ```
- **Strict Rule**: NEVER perform manual, untested ad-hoc coding directly in the production directory.

---

## 3. Database Multi-Environment Isolation Protocol
To prevent automated unit tests from truncating or resetting live production product catalogs, the database is strictly separated:
- **Production Server (`PM2`)**: Configured with `DATABASE_URL="file:./prod.db"` in `/home/ubuntu/production/threads-marketing`.
- **Vitest Unit & API Tests**: Configured in `vitest.config.ts` with `DATABASE_URL="file:./test.db"`.
- **Local Dev / Seeds**: Uses `dev.db` in `/home/ubuntu/project/threads-marketing`.

---

## 4. Hermes AI Copywriting & Skill Guidelines
Hermes Agent uses the **`ecommerce-copy-humanizer-id`** copywriting standard:
- **Natural, Casual Indonesian**: Authentic slang (`gess`, `sat-set`, `boncos`, `worth it`, `nugas`), balanced without cringe, strictly avoiding robotic stiff translation phrasing.
- **500 Character Limit**: Every single thread post must be under 500 characters.
- **Multi-Part Structure**:
  - **Post 1 (Hook)**: Engaging problem, relate/curhat question, or curiosity gap with thread indicator (`🧵👇`).
  - **Post 2 (Value / Product Proof)**: Dynamic USP list, real package pricing, and benefit comparisons.
  - **Post 3 (Action / CTA)**: Soft or hard CTA referencing the store's handle (e.g. `@hades.zshrc`) and ordering instructions.

### Dynamic Content Generation Angles (`src/lib/generation-engine.ts`):
1. **Product Promo Drafts**:
   - `Contrarian / Unpopular Opinion`
   - `Micro-Story & Curhat Relate`
   - `Value & Coffee Comparison`
   - `Productivity & Workflow Hack`
   - `FOMO & Slot Promo Terbatas`
   - `Kesalahan Fatal Pemula`
2. **Organic / Non-Product Drafts (`productId: null`)**:
   - `Edukasi & Produktivitas Organik`
   - `Tech & AI Insights`
   - `Storytelling & Curhat Relate`
   - `Rekomendasi Tools Digital`

---

## 5. AI Copilot Revision Engine (Option A)
The system includes an interactive in-editor Copilot engine (`src/lib/revision-engine.ts` and `POST /api/drafts/[id]/revise`):
- **Natural Language Parsing**: Automatically detects targeted parts (e.g. `"ubah post 3..."`, `"ganti hook..."`, `"tambah varian harga"`) or whole-thread tone shift (`"bikin lebih santai"`, `"bikin gaya fomo"`).
- **Hermes VPS LLM Connection**: Queries `http://168.110.198.40:20128/v1/chat/completions` with model `ag/gemini-3.6-flash-high`.
- **Dynamic Store Branding**: Injects `STORE_NAME` and `STORE_USERNAME` from `SystemConfig` into generated revisions.
- **Preview & AutoSave**: Supports testing revisions live with instant Threads Simulator update, and optional direct persistence.

---

## 6. Hermes Gateway Scheduler (`hermes cron`)
Scheduled tasks are registered directly into the **Hermes Gateway Service** (`hermes cron`):
- **`threads-marketing-post`** (`every 1m`): Fetches `APPROVED` drafts from `/api/hermes/drafts/approved` and publishes to Threads.
- **`threads-marketing-generate`** (`every 120m`): Fetches active products and store info from `/api/hermes/products/active`, generating both product promos and organic threads to `/api/hermes/drafts`.
- **Helper Scripts**: Located in `~/.hermes/scripts/threads_marketing_post.py` and `~/.hermes/scripts/threads_marketing_generate.py` targeting `/home/ubuntu/production/threads-marketing`.

---

## 7. Key REST Endpoints

### Store Admin & UI APIs:
- `GET, POST /api/products`: Manage product catalog
- `GET, PUT, DELETE /api/products/[id]`: Product details, update, delete
- `GET, POST /api/drafts`: Query and create content drafts
- `GET, PATCH, DELETE /api/drafts/[id]`: Draft inspection, multi-part post edits, approvals
- `POST /api/drafts/generate`: Dynamic Hermes AI draft generation with angles
- `POST /api/drafts/[id]/revise`: AI Copilot natural language revision
- `GET, POST /api/settings`: Read and update system configurations & store branding
- `GET /api/overview`: Aggregated analytics and queue KPIs

### Hermes Autonomous Agent APIs (`Authorization: Bearer <API_KEY>`):
- `GET /api/hermes/products/active`: Fetch active products and store profile
- `POST /api/hermes/drafts`: Autonomous draft creation (status: `PENDING_REVIEW`)
- `GET /api/hermes/drafts/approved`: Fetch queue of user-approved drafts ready for posting
- `PATCH /api/hermes/drafts/[id]/status`: Update draft status to `PUBLISHED` with post ID & live URL

---

## 8. Verification & Build Commands
- Run test suite: `npm test`
- Build production bundle: `npm run build`
- Restart production process: `npm run pm2:restart`
- Verify Hermes cron: `hermes cron status` and `hermes cron list`

---

## 9. Local Hermes & Development Setup Protocol
For local development in `/home/ubuntu/project/threads-marketing` (`dev` branch):

### A. Environment Configuration (`.env`):
- **Database**: `DATABASE_URL="file:./dev.db"`
- **Hermes LLM Connection**:
  ```env
  HERMES_AI_BASE_URL="http://168.110.198.40:20128/v1"
  HERMES_AI_API_KEY="<HERMES_VPS_API_KEY>"
  HERMES_AI_MODEL="ag/gemini-3.6-flash-high"
  ```
  *(Fallback: If `HERMES_AI_API_KEY` is not provided, the engine automatically attempts one-shot CLI execution via `hermes -z`).*

### B. Database Initialization:
```bash
npx prisma db push
npx prisma db seed # Seeds products & default HERMES_API_KEY ('hermes-secret-key-2026')
npm run dev        # Starts local web app on http://localhost:3000
```

### C. Testing Hermes Background Runner Locally:
There is no need to run system cron in dev. Execute runners on-demand via TypeScript or Python:

1. **TypeScript Runner (`npx tsx`)**:
   ```bash
   # Run full cycle (Generate AI Drafts + Publish Approved)
   npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=all --base-url=http://localhost:3000 --api-key=hermes-secret-key-2026

   # Only generate new AI drafts
   npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=generate --base-url=http://localhost:3000

   # Only publish approved drafts
   npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=post --base-url=http://localhost:3000
   ```

2. **Python 3 Runner (`python3`)**:
   ```bash
   chmod +x scripts/hermes-runner/hermes_mock_cron.py
   python3 scripts/hermes-runner/hermes_mock_cron.py --action all --base-url http://localhost:3000 --api-key hermes-secret-key-2026
   ```

