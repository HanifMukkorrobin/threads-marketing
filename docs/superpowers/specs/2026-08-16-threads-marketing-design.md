# Design Specification: Threads Marketing Auto Post & Content Draft Manager

**Date:** 2026-08-16  
**Status:** Approved  
**Path:** Architectural  

---

## 1. Overview & System Purpose

The **Threads Marketing Auto Post & Content Draft Manager** is a fullstack web application and API hub designed for digital product sellers (e.g., YouTube Premium, Spotify, Netflix, Canva, etc.). The system provides:
1. **Product Catalog & Context Management**: Stores rich metadata for each digital product (variants, pricing, USPs, target audience, tone of voice, CTA templates).
2. **AI Content Draft Lifecycle Management**: Manages generated drafts under a strict review model (`PENDING_REVIEW` -> `APPROVED` -> `PUBLISHED` / `FAILED`).
3. **Multi-Part Thread Editor & Realistic Preview**: Supports single posts and thread chains (1/N, 2/N) with 500-character limit tracking and a true-to-life Threads UI simulator.
4. **Hermes Agent REST API Integration**: Exposes authenticated endpoints allowing Hermes Agent cron jobs to fetch active product contexts, inject AI-generated drafts, poll approved drafts, and report live publication results back to the dashboard.

---

## 2. Architecture & Tech Stack

```
+-----------------------------------------------------------------------------------+
|                               Next.js 14/15 App Router                            |
|                                                                                   |
|  +-----------------------------+               +-------------------------------+  |
|  |       Frontend Pages        |               |        REST API Endpoints     |  |
|  | - / (Overview / Stats)      |               | - /api/products               |  |
|  | - /products (CRUD Context)  |               | - /api/drafts                 |  |
|  | - /drafts (Review / Kanban) |               | - /api/drafts/[id]            |  |
|  | - /drafts/[id] (Editor/Prev)|               | - /api/hermes/products/active |  |
|  | - /settings (API Keys & Doc)|               | - /api/hermes/drafts          |  |
|  +--------------+--------------+               | - /api/hermes/drafts/approved |  |
|                 |                              | - /api/hermes/drafts/[id]/status |
|                 |                              +---------------+---------------+  |
|                 v                                              v                  |
|  +-------------------------------------------------------------+---------------+  |
|  |                              Prisma ORM Client                              |  |
|  +-------------------------------------+---------------------------------------+  |
+----------------------------------------|------------------------------------------+
                                         v
                         +-------------------------------+
                         |           SQLite DB           |
                         |  (dev.db / production file)   |
                         +-------------------------------+
                                         ^
                                         | REST API (Bearer API Key)
                         +---------------+---------------+
                         |          Hermes Agent         |
                         |  (Cron AI Gen & Auto-Poster)  |
                         +-------------------------------+
```

### Core Technologies:
- **Framework**: Next.js (App Router, Server Components & Route Handlers, React 18/19, TypeScript).
- **Styling**: Tailwind CSS with custom typography & Threads-accurate design tokens (dark/light clean aesthetic).
- **Icons**: Lucide React.
- **Database & ORM**: SQLite with Prisma ORM.
- **Authentication**:
  - Web UI: Direct local access.
  - Hermes Agent Endpoints: Secured via `Authorization: Bearer <API_KEY>` or `x-api-key` header.

---

## 3. Database Schema (Prisma)

### `Product`
- `id`: String (cuid) [PK]
- `name`: String (e.g. "YouTube Premium 1 Bulan / 1 Tahun")
- `slug`: String [Unique]
- `category`: String (e.g. "Streaming Video", "Music", "Productivity")
- `description`: String?
- `variants`: String (JSON Array of `{ name: string, price: number, duration: string }`)
- `usp`: String (JSON Array of strings, e.g. `["Garansi Full", "Anti On-Hold", "Akun Pribadi"]`)
- `targetAudience`: String? (e.g. "Mahasiswa, pekerja kantor, pengguna mobile")
- `toneOfVoice`: String? (e.g. "Santai, Edukatif, Storytelling, FOMO")
- `ctaTemplate`: String? (e.g. "Order via link di bio atau WA: 0812xxx")
- `isActive`: Boolean (default `true`)
- `createdAt`: DateTime (now)
- `updatedAt`: DateTime (now)
- Relations: `drafts ContentDraft[]`

### `ContentDraft`
- `id`: String (cuid) [PK]
- `productId`: String? (FK to `Product.id`, nullable on delete SetNull)
- `title`: String (Internal title / hook description)
- `type`: String (`"SINGLE"` | `"THREAD_CHAIN"`, default `"SINGLE"`)
- `status`: String (`"PENDING_REVIEW"` | `"APPROVED"` | `"SCHEDULED"` | `"PUBLISHED"` | `"FAILED"`, default `"PENDING_REVIEW"`)
- `hookAngle`: String? (e.g. "Price Comparison", "Relatable Frustration", "Feature Breakdown")
- `scheduledAt`: DateTime?
- `publishedAt`: DateTime?
- `threadPostId`: String? (External Threads ID)
- `threadPostUrl`: String? (External Threads live URL)
- `errorMessage`: String? (Error log if Hermes post fails)
- `source`: String (default `"HERMES_AI"`, or `"MANUAL"`)
- `metadata`: String? (JSON string for extra agent metadata like model name, tokens, prompt version)
- `createdAt`: DateTime (now)
- `updatedAt`: DateTime (now)
- Relations: `product Product?`, `posts DraftPostItem[]`

### `DraftPostItem`
- `id`: String (cuid) [PK]
- `draftId`: String (FK to `ContentDraft.id`, onDelete Cascade)
- `orderIndex`: Int (0-based order: 0 = main post, 1 = first reply in thread, etc.)
- `content`: String (Text up to 500 characters)
- `mediaUrl`: String? (Optional image/video attachment URL)
- `createdAt`: DateTime (now)
- `updatedAt`: DateTime (now)

### `SystemConfig`
- `key`: String [PK] (e.g. `HERMES_API_KEY`, `STORE_USERNAME`, `STORE_AVATAR`)
- `value`: String
- `description`: String?
- `updatedAt`: DateTime (now)

---

## 4. Hermes Agent REST API Specification

All `/api/hermes/*` endpoints require header verification:
`Authorization: Bearer <HERMES_API_KEY>` or `x-api-key: <HERMES_API_KEY>`.

### 4.1. `GET /api/hermes/products/active`
- **Purpose**: Fetch all active products so Hermes Agent has updated context when prompting the LLM.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "products": [
      {
        "id": "clx...",
        "name": "YouTube Premium Individual",
        "category": "Streaming Video",
        "variants": [{ "name": "1 Bulan", "price": 25000 }, { "name": "3 Bulan", "price": 60000 }],
        "usp": ["Garansi Full 30 Hari", "No VPN", "Bisa Akun Lama/Baru"],
        "targetAudience": "Penikmat musik & video tanpa interupsi iklan",
        "toneOfVoice": "Santai, Edukatif, FOMO",
        "ctaTemplate": "Klik link di bio untuk order instan!"
      }
    ]
  }
  ```

### 4.2. `POST /api/hermes/drafts`
- **Purpose**: Hermes Agent submits newly generated AI content drafts.
- **Request Body**:
  ```json
  {
    "productId": "clx...",
    "title": "Nonton YouTube 10 Jam Bebas Iklan Cuma 25rb?",
    "type": "THREAD_CHAIN",
    "hookAngle": "Cost Breakdown",
    "posts": [
      { "orderIndex": 0, "content": "Kenapa masih betah nonton video 20 menit tapi kepotong 4 kali iklan?" },
      { "orderIndex": 1, "content": "Di toko kita, YouTube Premium 1 bulan cuma 25k garansi full anti-hold." },
      { "orderIndex": 2, "content": "Minat? Klik link di bio sekarang sebelum slot harian habis!" }
    ],
    "metadata": { "model": "hermes-3-70b", "generatedAt": "2026-08-16T05:00:00Z" }
  }
  ```
- **Behavior**: Saves draft with status `PENDING_REVIEW`.
- **Response**: `201 Created` with draft object and ID.

### 4.3. `GET /api/hermes/drafts/approved`
- **Purpose**: Hermes Agent queries for drafts approved by the store owner and ready for posting.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 1,
    "drafts": [
      {
        "id": "cly...",
        "title": "Nonton YouTube 10 Jam Bebas Iklan Cuma 25rb?",
        "type": "THREAD_CHAIN",
        "posts": [
          { "orderIndex": 0, "content": "..." },
          { "orderIndex": 1, "content": "..." }
        ]
      }
    ]
  }
  ```

### 4.4. `PATCH /api/hermes/drafts/[id]/status`
- **Purpose**: Updates draft status after Hermes attempts posting.
- **Request Body (Success)**:
  ```json
  {
    "status": "PUBLISHED",
    "threadPostId": "th_987654321",
    "threadPostUrl": "https://www.threads.net/@store/post/987654321"
  }
  ```
- **Request Body (Failure)**:
  ```json
  {
    "status": "FAILED",
    "errorMessage": "Rate limit reached / Login token invalid"
  }
  ```
- **Response**: `200 OK`

---

## 5. UI/UX & User Interface Features

1. **Dashboard Home (`/`)**:
   - Metric cards: Active Products, Pending Review, Approved (Ready to Post), Published.
   - Quick Recent Drafts list with one-click review button.
2. **Product Manager (`/products`)**:
   - Product list with search and category filters.
   - Modal/Drawer Form: Product Name, Category, Dynamic Variant/Pricing list, USP tag input, Target Audience, Tone of Voice, CTA template, Active toggle.
   - Quick JSON context preview for testing agent prompts.
3. **Content Drafts List (`/drafts`)**:
   - Status Tabs: All, Pending Review, Approved, Published, Failed.
   - Product filter dropdown.
   - Batch actions / Quick approve button.
4. **Interactive Editor & Live Threads Simulator (`/drafts/[id]`)**:
   - **Left Panel**: Multi-part thread editor, drag/reorder/delete parts, live character counter (500 limit with green/amber/red indicators).
   - **Right Panel**: Authentic Threads Mobile / Desktop mock view (threads line connection, like/comment/repost bar, store avatar & username).
   - **Action Bar**: "Approve & Mark Ready", "Save as Draft", "Reject / Delete".
5. **Settings & Hermes Agent Runner Docs (`/settings`)**:
   - Configure Hermes API Key, Store Handle, Store Avatar.
   - Ready-to-use Python and Node.js script examples for cron jobs.

---

## 6. Verification & Testing Plan

1. **Database & API Unit/Integration Tests**:
   - Seed sample products (YouTube Premium, Spotify Premium, Netflix).
   - Test CRUD operations on `/api/products` and `/api/drafts`.
   - Verify authentication middleware on `/api/hermes/*` (reject unauthorized requests with 401, allow valid keys).
   - Test posting submission from Hermes API -> verify status is `PENDING_REVIEW`.
   - Test status update to `APPROVED` -> verify it appears in `/api/hermes/drafts/approved`.
   - Test status update to `PUBLISHED` / `FAILED` -> verify database record updates correctly.
2. **UI & Component Verification**:
   - Multi-part thread editor character counting works accurately up to 500 characters.
   - Live Threads Preview updates synchronously as text is typed in the editor.
   - Adding and removing thread parts maintains correct `orderIndex`.
3. **Hermes Runner Script Verification**:
   - Test the bundled runner script (`scripts/hermes-runner/hermes_mock_cron.py` / `.ts`) against local server to verify end-to-end cron generation and auto-posting lifecycle.
