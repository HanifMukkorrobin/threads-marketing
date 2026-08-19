# Content Generation Engine Total Overhaul Specification

**Document ID**: `SPEC-2026-08-18-OVERHAUL-001`  
**Date**: 2026-08-18  
**Status**: VALIDATED & READY FOR IMPLEMENTATION  
**Target Platform**: Next.js 14 App Router, TypeScript, Hermes AI Agent (`ag/gemini-3.6-flash-high`), Obsidian Knowledge Vault (`KNOWLEDGE_VAULT_PATH`)

---

## 1. Executive Summary & Problem Root Causes

### 1.1 Root Causes of Previous Content Quality Issues
1. **Mad-Libs Template Generation**: The `hookHint` fields in `GENERATION_ANGLES` provided literal sentence formulas (e.g. *"Banyak orang ngira ..., padahal aslinya ..."*). The LLM treated these as rigid templates, producing identical opening sentences across different generations.
2. **Slang Checklist Syndrome**: Explicitly instructing the LLM with a list of slang words (`gess, sat-set, boncos, worth it, nugas`) caused the LLM to treat slang like a mandatory shopping list, shoehorning all slang words into every post in an artificial, forced manner.
3. **Rigid 3-Part Cookie-Cutter Structure**: Every thread followed the exact same cadence (*Post 1 Hook + `🧵👇` $\rightarrow$ Post 2 Title + 3 Bullets $\rightarrow$ Post 3 Question + CTA + Rocket Emoji*), making feeds visually repetitive and easily recognized as bot-generated ads.
4. **"Fake Organic" Content**: Posts marked as `Organik` (`productId: null`) were actually disguised sales pitches lecturing about illegal vs legal accounts. True organic content was missing.
5. **Starved Input / Lack of Knowledge Feeding**: Without specific research notes or case studies, the LLM defaulted to the only general concept in its weights ("illegal tools have viruses").

---

## 2. The 5 Architectural Overhaul Pillars

### 2.1 Pillar 1: Eliminating Template Mad-Libs & Enforcing Cold Opens
* **Remove sentence templates** from `GENERATION_ANGLES`.
* Replace `hookHint` with **Tactical Directives** that instruct *what evidence or perspective to lead with*, never *what words to start with*.
* Enforce **Cold Opens**:
  - Direct financial losses or time waste (e.g. *"Project 15 juta melayang..."*).
  - Specific technical anomalies or unexpected behaviors.
  - Provocative assertions backed immediately by empirical proof.
* **Banned Sentence Starters (Hard Constraint)**:
  - `"Banyak orang ngira..."`
  - `"Pernah gak sih..."`
  - `"Tahukah kamu..."`
  - `"Di era digital/modern ini..."`
  - `"Siapa sangka..."`
  - `"Jangan lewatkan..."`

### 2.2 Pillar 2: Persona-Driven Natural Indonesian vs Slang List
* Remove all explicit slang wordlists (`gess`, `sat-set`, `boncos`, etc.) from prompt instructions.
* Introduce an **Authentic Practitioner Persona**:
  - Direct, intelligent, experienced digital professional.
  - Speaks naturally with authentic Indonesian flow without forcing marketing jargon or Gen-Z slang.
  - Uses casual pronouns (`lu / gue` or conversational informal `kamu`) naturally where context demands.

### 2.3 Pillar 3: Dynamic Thread Rhythm & Multi-Archetype Formatting
Support 4 distinct visual and structural formats chosen dynamically by the generator:
1. **Format A (Micro-Story & Narrative Drama)**: Seamless narrative prose across 3 posts describing a real scenario, climax, and lesson learned (zero bullet points).
2. **Format B (Before vs After / Real Math Contrast)**: Sharp numerical comparison or workflow side-by-side.
3. **Format C (Actionable Step-by-Step Tactic)**: Concrete execution steps (1-2-3) with zero fluff.
4. **Format D (Contrarian Breakdown & Nuance)**: Deep-dive exposing a counter-intuitive truth.

### 2.4 Pillar 4: Strict Separation of Commercial Promos vs Pure Organic Content
* **Product Promo Mode (`productId !== null`)**:
  - High-converting commercial copy with real product USPs, package prices from SQLite, and clear transactional CTA pointing to `@store_username`.
* **Pure Organic Mode (`productId === null`)**:
  - **100% PURE VALUE & ZERO SELLING**.
  - Forbidden from mentioning store inventory, package prices, or sales pitches.
  - CTA is strictly soft-engagement: bookmarking/saving the thread, discussing in replies, or soft-follow for daily workflow tips.

### 2.5 Pillar 5: Obsidian Knowledge Vault Integration (`src/lib/knowledge-wiki.ts`)
* Read research notes, tools guides, and productivity frameworks from `KNOWLEDGE_VAULT_PATH` (`/knowledge/*.md`).
* When generating organic content, inject rich markdown content into the prompt context so Hermes synthesizes real insights instead of shallow generalities.

---

## 3. Module Specifications & Interfaces

### 3.1 `src/lib/generation-engine.ts`
* **`GENERATION_ANGLES` Overhaul**:
  ```typescript
  export const GENERATION_ANGLES: GenerationAngle[] = [
    {
      id: 'contrarian_insight',
      name: 'Unpopular Industry Truth',
      description: 'Menentang kebiasaan umum yang salah dengan argumen teknis/logis.',
      directive: 'Mulai langsung dengan fakta mengejutkan atau angka riil yang berlawanan dengan anggapan umum. Jangan buka dengan basa-basi.',
    },
    {
      id: 'real_case_study',
      name: 'Real Case & Breakdown Skenario',
      description: 'Studi kasus nyata saat deadline, workflow crash, atau efisiensi kerja.',
      directive: 'Mulai dengan deskripsi situasi spesifik (waktu, jenis project, kepanikan nyata) tanpa kata pengantar klise.',
    },
    {
      id: 'workflow_teardown',
      name: 'Workflow & Tool Teardown',
      description: 'Bedah komparasi sebelum vs sesudah menerapkan metode/tool tertentu.',
      directive: 'Tunjukkan kontras jam kerja (misal: 6 jam manual vs 15 menit otomatis).',
    },
    {
      id: 'cost_math_contrast',
      name: 'Real Math & Cost Analysis',
      description: 'Perhitungan matematis biaya tersembunyi vs investasi jangka panjang.',
      directive: 'Tampilkan perbandingan rupiah konkret per hari vs kerugian waktu.',
    },
    {
      id: 'actionable_framework',
      name: 'Actionable Framework / Step-by-Step',
      description: 'Panduan taktis step-by-step yang bisa langsung dipraktekkan hari ini.',
      directive: 'Bagi menjadi 3 langkah konkret yang bisa dieksekusi tanpa teori bertele-tele.',
    },
  ];
  ```

* **Prompt Builder Overhaul (`buildGenerationPrompt`)**:
  - Separates product promotional prompts and organic educational prompts into completely distinct prompt branches.
  - Product promo prompt injects dynamic pricing, real USPs, and transactional CTA.
  - Organic prompt injects knowledge topic notes and strictly forbids any mention of store catalog or selling.

### 3.2 `src/lib/knowledge-wiki.ts`
* Reads local Obsidian Vault files from `process.env.KNOWLEDGE_VAULT_PATH || './knowledge'`.
* Parses YAML frontmatter (`id`, `title`, `category`, `summary`, `tags`).
* Provides `loadAllKnowledgeTopics()`, `getKnowledgeTopicById()`, and `selectLRUKnowledgeTopic()`.

---

## 4. Verification Plan

1. **Unit Tests (`tests/generation-engine.test.ts`)**:
   - Verify prompt construction for product promo contains package pricing and CTA.
   - Verify prompt construction for organic content contains zero sales copy and enforces soft-engagement CTA.
   - Verify banned formula patterns are strictly rejected.
2. **Knowledge Wiki Tests (`tests/knowledge-wiki.test.ts`)**:
   - Verify reading and parsing Obsidian notes from test fixture folder.
   - Verify LRU selection across knowledge topics.
3. **Full Test Suite**:
   - Run `npx vitest run --fileParallelism=false` to verify zero regressions.
