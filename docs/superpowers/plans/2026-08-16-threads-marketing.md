# Threads Marketing Auto Post & Content Draft Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete fullstack Next.js web application for digital product sellers to manage product contexts, review & edit multi-part Threads marketing drafts (with 500-char live validation & authentic Threads simulator preview), and integrate seamlessly with Hermes Agent cron jobs via authenticated REST APIs.

**Architecture:** Next.js App Router with React Server/Client Components, Tailwind CSS, Lucide Icons, SQLite database managed via Prisma ORM, and bearer-token authenticated REST API routes for Hermes Agent interaction.

**Tech Stack:** Next.js 14/15, TypeScript, React, Tailwind CSS, Prisma ORM, SQLite, Vitest/Jest for automated tests, Lucide React icons.

**Spec:** [docs/superpowers/specs/2026-08-16-threads-marketing-design.md](file:///home/ubuntu/project/threads-marketing/docs/superpowers/specs/2026-08-16-threads-marketing-design.md)

## Global Constraints

- Platform: Linux / Node.js 18+
- Strict Review Model: All AI-generated drafts from Hermes start as `PENDING_REVIEW` and must be approved before being exposed in `/api/hermes/drafts/approved`.
- Authentication: `/api/hermes/*` endpoints enforce `Authorization: Bearer <HERMES_API_KEY>` or `x-api-key: <HERMES_API_KEY>`.
- Content Limit: Threads standard max 500 characters per post item.
- File-based SQLite Database for zero setup friction.

---

### Task 1: Scaffolding Next.js App with Tailwind, Lucide, and Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `postcss.config.js`, `tailwind.config.ts`, `vitest.config.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Test: `tests/setup.test.ts`

**Interfaces:**
- Consumes: Node.js environment
- Produces: Working Next.js app with Tailwind CSS styling and Vitest testing environment

- [ ] **Step 1: Write setup test**

Create `tests/setup.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Environment Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Initialize package.json, dependencies, and Next.js / Vitest configs**

Run: `npm init -y`
Install dependencies:
`npm install next react react-dom @prisma/client prisma lucide-react clsx tailwind-merge`
Install dev dependencies:
`npm install -D typescript @types/react @types/react-dom @types/node tailwindcss postcss autoprefixer vitest @vitejs/plugin-react`

Configure `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Configure `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        threads: {
          bg: '#101010',
          card: '#181818',
          border: '#282828',
          text: '#F3F5F7',
          secondary: '#777777',
          accent: '#0095F6',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 3: Run test to verify setup**

Run: `npx vitest run tests/setup.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts tailwind.config.ts postcss.config.js tests/setup.test.ts
git commit -m "chore: scaffold Next.js app with Tailwind, Vitest, and dependencies"
```

---

### Task 2: Database Schema (Prisma + SQLite), Client, and Seed Script

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `prisma/seed.ts`
- Test: `tests/database.test.ts`

**Interfaces:**
- Consumes: SQLite database connection
- Produces: Type-safe `prisma` client for `Product`, `ContentDraft`, `DraftPostItem`, `SystemConfig`

- [ ] **Step 1: Write database failing test**

Create `tests/database.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';

describe('Prisma Database Schema', () => {
  it('can create and query a product with rich context', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Test YouTube Premium',
        slug: 'test-youtube-premium',
        category: 'Streaming Video',
        variants: JSON.stringify([{ name: '1 Bulan', price: 25000 }]),
        usp: JSON.stringify(['Garansi 30 Hari', 'No VPN']),
        targetAudience: 'Mahasiswa & pekerja wfh',
        toneOfVoice: 'Santai & FOMO',
        ctaTemplate: 'Order via link di bio!',
        isActive: true,
      },
    });

    expect(product.id).toBeDefined();
    expect(product.name).toBe('Test YouTube Premium');

    const found = await prisma.product.findUnique({ where: { slug: 'test-youtube-premium' } });
    expect(found?.category).toBe('Streaming Video');

    // Clean up
    await prisma.product.delete({ where: { id: product.id } });
  });
});
```

- [ ] **Step 2: Define Prisma Schema & Generate Client**

Create `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Product {
  id              String         @id @default(cuid())
  name            String
  slug            String         @unique
  category        String
  description     String?
  variants        String         // JSON array: [{ name, price, duration }]
  usp             String         // JSON array: ["USP 1", "USP 2"]
  targetAudience  String?
  toneOfVoice     String?
  ctaTemplate     String?
  isActive        Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  drafts          ContentDraft[]
}

model ContentDraft {
  id              String          @id @default(cuid())
  productId       String?
  product         Product?        @relation(fields: [productId], references: [id], onDelete: SetNull)
  
  title           String
  type            String          @default("SINGLE") // "SINGLE" | "THREAD_CHAIN"
  status          String          @default("PENDING_REVIEW") // "PENDING_REVIEW" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "FAILED"
  
  hookAngle       String?
  scheduledAt     DateTime?
  publishedAt     DateTime?
  
  threadPostId    String?
  threadPostUrl   String?
  errorMessage    String?
  
  source          String          @default("HERMES_AI") // "HERMES_AI" | "MANUAL"
  metadata        String?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  posts           DraftPostItem[]
}

model DraftPostItem {
  id          String        @id @default(cuid())
  draftId     String
  draft       ContentDraft  @relation(fields: [draftId], references: [id], onDelete: Cascade)
  
  orderIndex  Int
  content     String
  mediaUrl    String?
  
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model SystemConfig {
  key         String        @id
  value       String
  description String?
  updatedAt   DateTime      @updatedAt
}
```

Create `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

Run migration and generate client:
`npx prisma db push`

- [ ] **Step 3: Create Seed Data (`prisma/seed.ts`)**

Create `prisma/seed.ts` containing realistic digital product context:
- YouTube Premium Individual & Family (anti-hold, full garansi, no VPN)
- Spotify Premium Individual 1/3/6 Bulan
- Netflix Premium 4K UHD Anti-Screen Limit
- Default SystemConfig with default Hermes API Key `hermes-secret-key-2026`

- [ ] **Step 4: Run test to verify DB operations**

Run: `npx vitest run tests/database.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/lib/prisma.ts tests/database.test.ts
git commit -m "feat: add prisma schema, database client, and seed file"
```

---

### Task 3: Hermes Agent REST API Endpoints & Auth Middleware

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/hermes/products/active/route.ts`
- Create: `src/app/api/hermes/drafts/route.ts`
- Create: `src/app/api/hermes/drafts/approved/route.ts`
- Create: `src/app/api/hermes/drafts/[id]/status/route.ts`
- Test: `tests/hermes-api.test.ts`

**Interfaces:**
- Consumes: Prisma client, request headers (`Authorization: Bearer ...` or `x-api-key: ...`)
- Produces: Authenticated JSON API endpoints for Hermes Agent

- [ ] **Step 1: Write failing tests for Hermes API endpoints**

Create `tests/hermes-api.test.ts` testing:
1. Unauthorized request without API key returns 401.
2. `GET /api/hermes/products/active` returns active products with parsed JSON USP and variants.
3. `POST /api/hermes/drafts` creates a new draft with status `PENDING_REVIEW` and nested `posts`.
4. `GET /api/hermes/drafts/approved` only returns drafts with `status === 'APPROVED'`.
5. `PATCH /api/hermes/drafts/:id/status` updates status to `PUBLISHED` (with `threadPostUrl`) or `FAILED` (with `errorMessage`).

- [ ] **Step 2: Implement Auth Middleware Helper (`src/lib/auth.ts`)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';

export async function validateHermesApiKey(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');

  let key = '';
  if (authHeader?.startsWith('Bearer ')) {
    key = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    key = apiKeyHeader.trim();
  }

  if (!key) return false;

  const config = await prisma.systemConfig.findUnique({
    where: { key: 'HERMES_API_KEY' },
  });

  const validKey = config?.value || process.env.HERMES_API_KEY || 'hermes-secret-key-2026';
  return key === validKey;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized: Invalid or missing Hermes API Key' },
    { status: 401 }
  );
}
```

- [ ] **Step 3: Implement API Route Handlers**

Implement:
- `src/app/api/hermes/products/active/route.ts`
- `src/app/api/hermes/drafts/route.ts`
- `src/app/api/hermes/drafts/approved/route.ts`
- `src/app/api/hermes/drafts/[id]/status/route.ts`

- [ ] **Step 4: Run test to verify API routes**

Run: `npx vitest run tests/hermes-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/hermes/ tests/hermes-api.test.ts
git commit -m "feat: implement hermes agent authenticated rest api endpoints"
```

---

### Task 4: Product Management UI & Internal API Routes

**Files:**
- Create: `src/app/api/products/route.ts`
- Create: `src/app/api/products/[id]/route.ts`
- Create: `src/components/ProductModal.tsx`
- Create: `src/components/ProductCard.tsx`
- Create: `src/app/products/page.tsx`
- Test: `tests/products-api.test.ts`

**Interfaces:**
- Consumes: Prisma client
- Produces: Full CRUD UI for digital products with dynamic variant list and USP tags

- [ ] **Step 1: Write failing test for Product CRUD API**

Create `tests/products-api.test.ts` testing create, update, list, delete, and toggle active on `/api/products`.

- [ ] **Step 2: Implement `/api/products` and `/api/products/[id]` routes**

Support:
- `GET /api/products`: list all with filtering.
- `POST /api/products`: create product.
- `PUT /api/products/[id]`: update product details.
- `DELETE /api/products/[id]`: delete product.
- `PATCH /api/products/[id]`: toggle `isActive`.

- [ ] **Step 3: Build Product Management UI Components**

- `ProductModal.tsx`: dynamic input fields for variants (Name + Price) and USP tags (add/remove pill tags), category selection, target audience, tone of voice, and CTA template.
- `ProductCard.tsx`: clean card with category badge, active status toggle, pricing summary, and copy prompt context button.
- `src/app/products/page.tsx`: product catalog grid with search bar and filter by category.

- [ ] **Step 4: Run test to verify Product APIs and UI logic**

Run: `npx vitest run tests/products-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/products/ src/components/Product* src/app/products/ tests/products-api.test.ts
git commit -m "feat: add product management page, modal, and crud api"
```

---

### Task 5: Content Drafts Management Dashboard & Status Workflow

**Files:**
- Create: `src/app/api/drafts/route.ts`
- Create: `src/app/api/drafts/[id]/route.ts`
- Create: `src/components/DraftStatusBadge.tsx`
- Create: `src/components/DraftCard.tsx`
- Create: `src/app/drafts/page.tsx`
- Test: `tests/drafts-api.test.ts`

**Interfaces:**
- Consumes: Products and ContentDraft tables
- Produces: Filterable draft management interface with status-based actions

- [ ] **Step 1: Write failing test for Drafts internal API**

Create `tests/drafts-api.test.ts` testing status transitions (`PENDING_REVIEW` -> `APPROVED` -> `PUBLISHED` / `FAILED`), deleting drafts, and listing drafts by status.

- [ ] **Step 2: Implement `/api/drafts` and `/api/drafts/[id]` routes**

- `GET /api/drafts`: Filter by status (`all`, `PENDING_REVIEW`, `APPROVED`, `PUBLISHED`, `FAILED`) and `productId`.
- `POST /api/drafts`: Manual draft creation.
- `PUT /api/drafts/[id]`: Update draft title, hook angle, status, and post items.
- `DELETE /api/drafts/[id]`: Delete draft and cascade delete post items.

- [ ] **Step 3: Build Drafts Listing & Kanban Page**

- `DraftStatusBadge.tsx`: Visual badge with distinct status colors (Amber for Pending Review, Green for Approved, Blue for Published, Red for Failed).
- `DraftCard.tsx`: Card showing hook angle, product name, thread type (Single / Thread Chain with part count), snippet of post 1, status, and quick "Approve" button.
- `src/app/drafts/page.tsx`: Tabbed view for statuses, search filter, and quick navigation to interactive editor.

- [ ] **Step 4: Run test to verify Drafts APIs**

Run: `npx vitest run tests/drafts-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/drafts/ src/components/Draft* src/app/drafts/ tests/drafts-api.test.ts
git commit -m "feat: add content draft list page, status workflow, and api"
```

---

### Task 6: Interactive Multi-Part Threads Draft Editor & Authentic Live Threads Simulator

**Files:**
- Create: `src/components/ThreadsPreview.tsx`
- Create: `src/components/ThreadPartEditor.tsx`
- Create: `src/app/drafts/[id]/page.tsx`
- Test: `tests/thread-editor.test.ts`

**Interfaces:**
- Consumes: `DraftPostItem[]` data, store handle and avatar configs
- Produces: Real-time dual-pane editor with live character counter (500 char limit) and authentic Threads simulator

- [ ] **Step 1: Write test for character count and thread ordering logic**

Create `tests/thread-editor.test.ts` testing:
1. Validating 500-char max per post part.
2. Reordering and adding/removing thread parts keeps sequential `orderIndex`.

- [ ] **Step 2: Implement ThreadsPreview component**

Build `src/components/ThreadsPreview.tsx`:
- Mobile device container style (dark theme #101010).
- Authentic Threads header: Store avatar, username `@tokocuan.digital`, verified badge option, timestamp.
- Vertical connecting line linking thread parts (0 to N-1).
- Content typography styled matching Threads font and spacing.
- Threads action icons: Heart, Reply, Repost, Share.
- Multi-post indicator: `1/3`, `2/3`, `3/3` or thread chain flow.

- [ ] **Step 3: Implement ThreadPartEditor & Draft Editor Page**

Build `src/app/drafts/[id]/page.tsx`:
- Left pane:
  - Draft title & hook angle selector.
  - Linked product dropdown.
  - Dynamic list of post parts with character progress bars (Green < 400, Amber 400-500, Red > 500).
  - "+ Add Thread Part" button and delete button.
  - Action buttons: "Approve & Mark Ready for Hermes", "Save Changes", "Delete Draft".
- Right pane:
  - Live interactive `ThreadsPreview` updating in real-time.

- [ ] **Step 4: Run test to verify editor logic**

Run: `npx vitest run tests/thread-editor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ThreadsPreview.tsx src/components/ThreadPartEditor.tsx src/app/drafts/[id]/page.tsx tests/thread-editor.test.ts
git commit -m "feat: implement interactive multi-part thread editor and live threads simulator"
```

---

### Task 7: Dashboard Overview, Settings & Hermes Agent Runner Script

**Files:**
- Create: `src/components/Navbar.tsx`
- Create: `src/app/page.tsx` (Dashboard Overview)
- Create: `src/app/settings/page.tsx`
- Create: `src/app/api/settings/route.ts`
- Create: `scripts/hermes-runner/hermes_mock_cron.py`
- Create: `scripts/hermes-runner/hermes_mock_cron.ts`
- Create: `scripts/hermes-runner/README.md`
- Test: `tests/hermes-runner.test.ts`

**Interfaces:**
- Consumes: Hermes API endpoints
- Produces: Main dashboard analytics, settings management, and ready-to-run Hermes cron runner scripts

- [ ] **Step 1: Write test for Hermes Runner simulation**

Create `tests/hermes-runner.test.ts` testing the runner script's logic for querying active products, creating a draft, polling approved drafts, and reporting publication status.

- [ ] **Step 2: Implement Overview Dashboard & Navigation**

Build `src/app/page.tsx`:
- Top statistics: Active Products, Drafts Pending Review, Approved & Ready to Post, Total Published Posts.
- Recent Drafts quick action queue.
- Quick system status: Hermes API connectivity status.

- [ ] **Step 3: Implement Settings Page & API**

Build `src/app/settings/page.tsx`:
- Manage `HERMES_API_KEY`.
- Manage Store Profile: Store Name, Threads Handle (e.g. `@tokodigital.id`), Avatar URL.
- Live API Documentation with copyable `curl`, Python, and TypeScript code snippets.

- [ ] **Step 4: Create Ready-to-Run Hermes Scripts**

Create `scripts/hermes-runner/hermes_mock_cron.ts` and `hermes_mock_cron.py`:
- Function 1: `fetch_active_products()`
- Function 2: `submit_ai_draft()`
- Function 3: `poll_and_post_approved_drafts()`
- Include detailed instructions in `scripts/hermes-runner/README.md`.

- [ ] **Step 5: Run tests to verify**

Run: `npx vitest run tests/hermes-runner.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/settings/ src/components/Navbar.tsx scripts/hermes-runner/ tests/hermes-runner.test.ts
git commit -m "feat: add dashboard overview, settings page, and hermes runner scripts"
```

---

### Task 8: End-to-End Verification & Quality Polish

**Files:**
- Test: `tests/e2e-workflow.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write complete End-to-End workflow test**

Create `tests/e2e-workflow.test.ts` verifying the full marketing pipeline:
1. Product creation (e.g. YouTube Premium 1 Bulan 25k).
2. Hermes fetches active product context.
3. Hermes generates and POSTs a 3-part Thread draft -> verify status is `PENDING_REVIEW`.
4. Store owner reviews and approves the draft -> status becomes `APPROVED`.
5. Hermes polls `/api/hermes/drafts/approved` -> receives the approved 3-part draft.
6. Hermes posts to Threads and updates status to `PUBLISHED` with thread URL.
7. Verify dashboard statistics and product draft relation.

- [ ] **Step 2: Run all test suites**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Build & Lint check**

Run: `npm run build`
Expected: Build succeeds without TypeScript or ESLint errors.

- [ ] **Step 4: Update Documentation in README.md**

Write complete setup and Hermes integration guide in `README.md`.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/e2e-workflow.test.ts
git commit -m "docs: add full documentation and e2e verification tests"
```
