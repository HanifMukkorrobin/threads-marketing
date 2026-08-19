# Deprecate E-Commerce Copywriting Skill & Implement Authentic Tech Practitioner Persona

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghilangkan dependensi skill `ecommerce-copy-humanizer-id` dan instruksi *forced slang* (`gess`, `sat-set`, `boncos`, `nugas`, dll.) dari Hermes AI, serta memisahkan arsitektur prompt menjadi **Dual Persona**: *Authentic Tech Systems Practitioner* untuk konten knowledge base / organik, dan *Clean Value Copywriter* untuk promosi produk resmi.

**Architecture:**
1. Pisahkan system prompt di `src/lib/hermes-client.ts` menjadi dua konstanta mandiri: `HERMES_TECH_PRACTITIONER_SYSTEM_PROMPT` (analisis mendalam, trade-off arsitektur, alur eksekusi riil, tanpa slang jualan) dan `HERMES_COMMERCIAL_PROMO_SYSTEM_PROMPT` (value proposition jelas, transparan, tanpa hype murahan).
2. Perbarui `src/lib/generation-engine.ts` agar memilih system prompt yang sesuai berdasarkan cabang generasi (`product != null` vs `knowledgeTopic / organic`), serta memperketat direktif Post #2 agar berupa *mekanisme alur kerja konkret* bukan sekadar *listicle definisi kamus*.
3. Perbarui script runner (`scripts/hermes-runner/hermes_mock_cron.ts` dan `hermes_mock_cron.py`) untuk menghapus metadata `ecommerce-copy-humanizer-id` dan merombak fallback template menjadi tulisan praktisi yang substantif.
4. Perbarui dokumentasi (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `PRODUCT.md`, `README.md`) dan sesuaikan seluruh unit test di `tests/`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Python 3, Vitest, Hermes VPS LLM (`ag/gemini-3.6-flash-high`).

---

### Task 1: Refactor System Prompts & Revision Engine di `src/lib/hermes-client.ts`

**Files:**
- Modify: `src/lib/hermes-client.ts`
- Test: `tests/hermes-revision.test.ts` & `tests/revision-engine.test.ts`

**Interfaces:**
- Produces: `HERMES_TECH_PRACTITIONER_SYSTEM_PROMPT`, `HERMES_COMMERCIAL_PROMO_SYSTEM_PROMPT`
- Consumes: `callHermesChatCompletion(prompt: string, systemPrompt?: string)`

- [ ] **Step 1: Update test expectation untuk memverifikasi hilangnya forced slang dan rujukan e-commerce**
- [ ] **Step 2: Jalankan test untuk melihat status awal**
  Run: `npm test tests/revision-engine.test.ts`
- [ ] **Step 3: Implementasi dual system prompt & perbaiki `buildRevisionPrompt`**
  - Hapus string `ecommerce-copy-humanizer-id` dan daftar kata slang `(gess, sat-set, boncos, worth it, nugas, anti-ribet, kantong jebol)`.
  - Buat `HERMES_TECH_PRACTITIONER_SYSTEM_PROMPT`: Persona Senior Software & AI Architect yang fokus pada alur kerja nyata, kegagalan teknis, dan *tangible implementation*.
  - Buat `HERMES_COMMERCIAL_PROMO_SYSTEM_PROMPT`: Persona Digital Specialist yang profesional, to-the-point, dan berorientasi pada transparansi value.
  - Perbarui fungsi `buildRevisionPrompt` agar menyesuaikan persona berdasarkan keberadaan produk.
- [ ] **Step 4: Jalankan test untuk memverifikasi kelulusan**
  Run: `npm test tests/revision-engine.test.ts tests/hermes-revision.test.ts`
- [ ] **Step 5: Commit perubahan Task 1**
  ```bash
  git add src/lib/hermes-client.ts tests/revision-engine.test.ts tests/hermes-revision.test.ts
  git commit -m "refactor(hermes): replace ecommerce copywriter with practitioner and clean promo personas"
  ```

---

### Task 2: Perombakan Prompt Generation Engine di `src/lib/generation-engine.ts`

**Files:**
- Modify: `src/lib/generation-engine.ts`
- Test: `tests/generation-engine.test.ts`

**Interfaces:**
- Produces: `generateDraftWithHermes(input: GenerationInput)` with dynamic system prompt passing
- Consumes: `HERMES_TECH_PRACTITIONER_SYSTEM_PROMPT`, `HERMES_COMMERCIAL_PROMO_SYSTEM_PROMPT`

- [ ] **Step 1: Tulis unit test untuk memverifikasi bahwa konten organik menggunakan persona Tech Practitioner tanpa format listicle kamus**
- [ ] **Step 2: Jalankan test dan konfirmasi ekspektasi**
  Run: `npm test tests/generation-engine.test.ts`
- [ ] **Step 3: Modifikasi `buildGenerationPrompt` dan `generateDraftWithHermes`**
  - Untuk konten Organik / Knowledge Vault:
    - Post #1 (Hook): Fokus pada bottleneck arsitektur / realita lapangan / kegagalan sistem.
    - Post #2 (Daging / Mekanisme): Wajib menjelaskan alur kerja operasional (misal: *Input ➔ Eksekusi Tool CLI/API ➔ Validasi Error*) bukan sekadar definisi istilah.
    - Post #3 (Diskusi): Ajakan diskusi teknis atau pertimbangan arsitektur yang relevan.
  - Operasikan `callHermesChatCompletion(prompt, isOrganic ? HERMES_TECH_PRACTITIONER_SYSTEM_PROMPT : HERMES_COMMERCIAL_PROMO_SYSTEM_PROMPT)`.
- [ ] **Step 4: Jalankan test untuk memverifikasi kelulusan**
  Run: `npm test tests/generation-engine.test.ts`
- [ ] **Step 5: Commit perubahan Task 2**
  ```bash
  git add src/lib/generation-engine.ts tests/generation-engine.test.ts
  git commit -m "feat(generation-engine): enforce deep practitioner directives for organic knowledge threads"
  ```

---

### Task 3: Refactor Hermes Runner Scripts (TypeScript & Python)

**Files:**
- Modify: `scripts/hermes-runner/hermes_mock_cron.ts`
- Modify: `scripts/hermes-runner/hermes_mock_cron.py`
- Test: `tests/hermes-runner.test.ts`

**Interfaces:**
- Produces: Clean runner execution with updated metadata (`persona: "TECH_SYSTEMS_PRACTITIONER"`)

- [ ] **Step 1: Update unit test untuk runner**
- [ ] **Step 2: Jalankan test runner**
  Run: `npm test tests/hermes-runner.test.ts`
- [ ] **Step 3: Update `hermes_mock_cron.ts` dan `hermes_mock_cron.py`**
  - Hapus string `ecommerce-copy-humanizer-id` dari metadata dan archetype generators.
  - Rombak fallback template agar menyajikan contoh kasus konkret dan alur teknis, bukan sekadar listicle tips umum.
- [ ] **Step 4: Jalankan test untuk memverifikasi kelulusan**
  Run: `npm test tests/hermes-runner.test.ts`
- [ ] **Step 5: Commit perubahan Task 3**
  ```bash
  git add scripts/hermes-runner/hermes_mock_cron.ts scripts/hermes-runner/hermes_mock_cron.py tests/hermes-runner.test.ts
  git commit -m "refactor(hermes-runner): remove ecommerce copywriting skill and update fallback archetypes"
  ```

---

### Task 4: Pembaruan Dokumentasi & Rules Codebase

**Files:**
- Modify: `AGENTS.md`
- Modify: `GEMINI.md`
- Modify: `CLAUDE.md`
- Modify: `PRODUCT.md`
- Modify: `README.md`

- [ ] **Step 1: Perbarui Bagian 4 di semua file panduan arsitektur**
  - Ganti judul dan deskripsi dari `Hermes AI Copywriting & Skill Guidelines (ecommerce-copy-humanizer-id)` menjadi `Hermes AI Persona & Copywriting Standard (Tech Systems Practitioner & Clean Commercial Promo)`.
  - Hapus rujukan slang wajib (`gess`, `sat-set`, `boncos`).
- [ ] **Step 2: Commit perubahan dokumentasi**
  ```bash
  git add AGENTS.md GEMINI.md CLAUDE.md PRODUCT.md README.md
  git commit -m "docs: update hermes copywriting standard to tech systems practitioner"
  ```

---

### Task 5: Verifikasi Menyeluruh & Testing E2E

**Files:**
- Test: Seluruh test suite (`npm test`)

- [ ] **Step 1: Jalankan seluruh test suite**
  Run: `npm test`
- [ ] **Step 2: Verifikasi build Next.js**
  Run: `npm run build`
- [ ] **Step 3: Jalankan simulasi runner TypeScript lokal**
  Run: `npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=generate`
