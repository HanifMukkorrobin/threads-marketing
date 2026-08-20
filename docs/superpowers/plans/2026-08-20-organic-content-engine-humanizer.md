# Dynamic Content Generation Blueprints & Hermes Runner LRU Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merombak total arsitektur generator konten Threads agar menghasilkan konten organik berbobot tinggi, variatif, dan mengalir seperti praktisi asli (bukan template kamus / listicle kaku 1-2-3), serta memperbaiki bug rotasi LRU topic dan angle di Hermes Cron Runner.

**Architecture:**
1. **Dynamic Content Blueprints di `src/lib/generation-engine.ts`**:
   - Menghadirkan 4 blueprint struktur konten organik:
     - `INCIDENT_AUTOPSY`: Cerita insiden nyata / debugging breakdown / failure mode di production dan solusinya.
     - `CONFIG_CLI_TEARDOWN`: Bedah konfigurasi nyata (contoh `.cursorrules`, CLI pipeline, MCP server config, DevTools).
     - `ARCHITECTURE_TRADEOFF`: Matriks perbandingan tajam (kapan pakai A vs B, jebakan arsitektur, trade-off konkurensi/state).
     - `CONTRARIAN_PARADIGM`: Opini berani membongkar *cargo-culting* AI/engineering dengan penalaran lugas.
   - **Anti-Mad-Libs & Anti-Listicle Guard**: Melarang keras format listicle nomor `1. Poin: Penjelasan` di Post 2 dan melarang penutup robotik seragam di Post 3.
2. **Perbaikan LRU Topic & Angle Rotation di `scripts/hermes-runner/`**:
   - Ambil riwayat draft aktual dari database / API dan umpankan ke `selectLRUKnowledgeTopic` agar 65 topik di Knowledge Vault digilir secara deterministik.
   - Rotasi angle menggunakan daftar ID angle valid dari `GENERATION_ANGLES` (bukan string kategori folder Obsidian).
   - Sinkronisasi rotasi produk dengan `selectLRUProduct`.
3. **Environment & Path Standardization**:
   - Set `KNOWLEDGE_VAULT_PATH="/home/ubuntu/production/threads-base-knowledge"` di `.env` dev & prod.
4. **Testing Suite & Verification**:
   - Vitest unit tests untuk blueprint prompt, LRU topic rotation, angle rotation, dan hermes cron runner.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Vitest, SQLite / Prisma, Hermes VPS AI (`ag/gemini-3.6-flash-high`).

---

### Task 1: Update Environment & Test Harness Preparation

**Files:**
- Modify: `.env`
- Modify: `tests/knowledge-wiki.test.ts`

**Interfaces:**
- Produces: Reliable knowledge vault loading from `/home/ubuntu/production/threads-base-knowledge` or local fallback

- [ ] **Step 1: Update `.env` di development environment agar mengarah ke vault yang valid**
  Pastikan `KNOWLEDGE_VAULT_PATH="/home/ubuntu/production/threads-base-knowledge"` tertulis di `.env`.
- [ ] **Step 2: Tambahkan unit test di `tests/knowledge-wiki.test.ts` untuk memverifikasi LRU rotation beruntun dengan draft history**
- [ ] **Step 3: Jalankan test untuk memverifikasi behavior saat ini**
  Run: `npm test tests/knowledge-wiki.test.ts`
- [ ] **Step 4: Commit perubahan Task 1**
  ```bash
  git add .env tests/knowledge-wiki.test.ts
  git commit -m "chore(config): synchronize knowledge vault path and add LRU topic rotation tests"
  ```

---

### Task 2: Implementasi Dynamic Blueprints & Anti-Listicle Directives di `src/lib/generation-engine.ts`

**Files:**
- Modify: `src/lib/generation-engine.ts`
- Test: `tests/generation-engine.test.ts`

**Interfaces:**
- Produces: `ORGANIC_BLUEPRINTS`, updated `buildGenerationPrompt`, enhanced `generateDraftWithHermes`
- Consumes: `KnowledgeTopic`, `GENERATION_ANGLES`

- [ ] **Step 1: Tulis unit test baru di `tests/generation-engine.test.ts`**
  - Verifikasi prompt builder menyuntikkan Blueprint acak/spesifik (`INCIDENT_AUTOPSY`, `CONFIG_CLI_TEARDOWN`, `ARCHITECTURE_TRADEOFF`, `CONTRARIAN_PARADIGM`).
  - Verifikasi prompt memuat aturan anti-listicle (`DILARANG memakai format listicle nomor 1-2-3`).
  - Verifikasi variasi instruksi closing di Post #3.
- [ ] **Step 2: Jalankan test untuk melihat status kegagalan (TDD)**
  Run: `npm test tests/generation-engine.test.ts`
- [ ] **Step 3: Implementasi Blueprints dan Refactor `buildGenerationPrompt`**
  - Definisikan `ORGANIC_BLUEPRINTS` dengan instruksi naratif yang hidup.
  - Suntikkan blueprint terpilih ke dalam prompt organik.
  - Pertegas direktif negatif anti-klise (larang: *"Kebanyakan engineering team terjebak ilusi..."*, *"Alur kerja: 1. Poin A, 2. Poin B"*, *"Bookmark thread ini... Follow @..."*).
  - Berikan variasi gaya closing (pertanyaan santai antar-builder, refleksi arsitektur, kesimpulan lugas).
- [ ] **Step 4: Jalankan unit test untuk memastikan kelulusan**
  Run: `npm test tests/generation-engine.test.ts`
- [ ] **Step 5: Commit perubahan Task 2**
  ```bash
  git add src/lib/generation-engine.ts tests/generation-engine.test.ts
  git commit -m "feat(generation-engine): introduce dynamic practitioner blueprints and anti-listicle constraints"
  ```

---

### Task 3: Perbaikan Rotasi LRU & Riwayat di `scripts/hermes-runner/hermes_mock_cron.ts` dan `hermes_mock_cron.py`

**Files:**
- Modify: `scripts/hermes-runner/hermes_mock_cron.ts`
- Modify: `scripts/hermes-runner/hermes_mock_cron.py`
- Test: `tests/hermes-runner.test.ts`

**Interfaces:**
- Produces: `runHermesRunner` dengan rotasi riwayat draft nyata untuk Knowledge Topic, Angle, dan Produk.

- [ ] **Step 1: Tulis unit test di `tests/hermes-runner.test.ts` untuk menguji rotasi topik bergilir saat generate dieksekusi berkali-kali**
- [ ] **Step 2: Jalankan test runner untuk melihat ekspektasi**
  Run: `npm test tests/hermes-runner.test.ts`
- [ ] **Step 3: Perbaiki logika pemilihan topik dan angle di `hermes_mock_cron.ts` dan `hermes_mock_cron.py`**
  - Ambil draft history dari `/api/drafts` atau panggil `getRecentDraftHistory`.
  - Operkan riwayat draft ke `selectLRUKnowledgeTopic(vaultTopics, recentDrafts)`.
  - Pilih angle dari `GENERATION_ANGLES` menggunakan `selectRotatedAngle(allAngleNames, recentAngles)`.
  - Pilih produk menggunakan `selectLRUProduct(products, recentDrafts)`.
- [ ] **Step 4: Jalankan test runner untuk memastikan seluruh skenario lulus**
  Run: `npm test tests/hermes-runner.test.ts`
- [ ] **Step 5: Commit perubahan Task 3**
  ```bash
  git add scripts/hermes-runner/hermes_mock_cron.ts scripts/hermes-runner/hermes_mock_cron.py tests/hermes-runner.test.ts
  git commit -m "fix(hermes-runner): fix LRU topic rotation, angle rotation, and history ingestion"
  ```

---

### Task 4: Verifikasi Menyeluruh & Testing E2E

**Files:**
- Test: Seluruh unit test suite (`npm test`)
- Run: Build verification (`npm run build`)
- Run: CLI mock cron verification (`npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=generate`)

- [ ] **Step 1: Jalankan seluruh test suite Vitest**
  Run: `npm test`
- [ ] **Step 2: Verifikasi build Next.js**
  Run: `npm run build`
- [ ] **Step 3: Uji eksekusi generasi draft beruntun (3x) untuk memastikan topik dan format selalu berganti dan natural**
- [ ] **Step 4: Commit dan siapkan panduan deploy ke production**
