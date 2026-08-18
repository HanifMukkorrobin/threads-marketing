# Hybrid Content Deduplication & Freshness Engine Specification

**Document ID**: `SPEC-2026-08-18-DEDUP-001`  
**Date**: 2026-08-18  
**Status**: VALIDATED & READY FOR IMPLEMENTATION  
**Target Platform**: Next.js 14 App Router, TypeScript, SQLite (Prisma ORM), Ollama Embedding (`nomic-embed-text-v2-moe`), Hermes AI Agent (`ag/gemini-3.6-flash-high`)

---

## 1. Overview & Problem Statement

### 1.1 Context
In the current Threads Marketing architecture:
1. **Posting Guarantee**: Published drafts are strictly locked. Once a draft is published to Meta Threads Graph API, its status becomes `PUBLISHED` with `threadPostId` and `threadPostUrl`. Endpoint `/api/hermes/drafts/approved` only queries `status: 'APPROVED'`, ensuring already-posted content is never published again.
2. **Generation Gap**: Content generation was previously *stateless*. When Hermes AI or an admin generated new drafts, the system did not pass historical draft context to the LLM or check whether the generated hook/copy resembled recently published threads.

### 1.2 Objective
Implement an end-to-end **Hybrid Content Deduplication & Freshness Engine** that guarantees all generated content on Threads is fresh, non-repetitive, high-converting, and distinct from any previously published or approved content within a rolling 30-day window (or last 10 posts).

---

## 2. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Trigger [Trigger Stage]
        T1[Admin UI / Manual Generate]
        T2[Autonomous Hermes Cron Runner]
    end

    subgraph Selection [Rotation & Context Selection]
        T1 & T2 --> R1[Rotation Engine: LRU Product & Angle Selector]
        R1 --> R2[Query History: Fetch Last 10 APPROVED/PUBLISHED Drafts]
    end

    subgraph PromptEngine [AI Generation with Negative Context]
        R2 --> P1[Build Prompt with Negative Context Section]
        P1 --> P2[Call Hermes LLM ag/gemini-3.6-flash-high]
        P2 --> P3[Candidate Draft Generated]
    end

    subgraph FreshnessValidation [Hybrid Freshness Validation]
        P3 --> V1{Check Primary: Ollama nomic-embed-text-v2-moe}
        V1 -->|Online| V2[Compute Vector Cosine Similarity vs History]
        V1 -->|Offline / Timeout| V3[Fallback: N-Gram Jaccard Token Overlap]
        V2 --> V4{Highest Sim > Threshold?}
        V3 --> V4
    end

    subgraph Decision [Decision & Retry Pipeline]
        V4 -->|YES: Duplication Detected| D1{Retry Attempt < 2?}
        D1 -->|Yes| D2[Inject Strict Contrast Directives & Re-prompt LLM] --> P2
        D1 -->|No| D3[Fallback Safe Variant Generator with Distinct Structure] --> S1
        V4 -->|NO: Verified Fresh| S1[Persist Draft: status=PENDING_REVIEW]
    end
```

---

## 3. Core Modules & Component Architecture

### 3.1 `src/lib/embedding-client.ts`
Client for communicating with the Ollama embedding service on VPS (`http://168.110.198.40:11434`).

* **Configuration**:
  - `OLLAMA_EMBED_BASE_URL`: Defaults to `http://168.110.198.40:11434`
  - `OLLAMA_EMBED_MODEL`: Defaults to `nomic-embed-text-v2-moe`
  - `OLLAMA_EMBED_TIMEOUT_MS`: `4000ms` (fail-fast to fallback)
* **Key Functions**:
  - `getBatchEmbeddings(texts: string[]): Promise<number[][] | null>`: Calls `/api/embed` with batch payload `{"model": "nomic-embed-text-v2-moe", "input": texts}`.
  - `cosineSimilarity(vecA: number[], vecB: number[]): number`: Computes dot product normalized by vector magnitudes in pure TypeScript.

### 3.2 `src/lib/content-deduplication.ts`
Orchestrator for history lookback, lexical token analysis, and hybrid freshness validation.

* **Lookback Queries**:
  - `getRecentDraftHistory(productId?: string | null, limit = 10)`:
    - If `productId` is provided: queries `ContentDraft` where `productId = productId` and `status IN ('APPROVED', 'PUBLISHED')` ordered by `createdAt DESC` limit `10`.
    - If `productId` is null (organic/educational): queries `ContentDraft` where `productId IS NULL` and `status IN ('APPROVED', 'PUBLISHED')` limit `10`.
* **Lexical Fallback (N-gram Jaccard Similarity)**:
  - Text normalization: strip markdown symbols, URLs, emoji, lowercase, tokenize words.
  - Generates 2-gram and 3-gram sets and calculates Jaccard Index: `|A ∩ B| / |A ∪ B|`.
* **Hybrid Freshness Check**:
  - `validateDraftFreshness(candidate: CandidateDraft, history: HistoricalDraft[])`:
    - Evaluates post 1 (Hook) and full thread chain text.
    - Uses Vector Cosine Similarity if embedding service is reachable (Threshold: `0.70`).
    - Uses Lexical Jaccard Overlap if embedding is unreachable (Threshold: `0.60`).
    - Returns `{ isFresh: boolean, score: number, method: 'vector' | 'lexical', matchedSnippet?: string }`.

### 3.3 `src/lib/generation-engine.ts` (Modifications)
Enhance `buildGenerationPrompt` and `generateDraftWithHermes` with negative context and retry loop.

* **Negative Context Injection**:
  If history exists, inject a dedicated negative constraints section into the system prompt:
  ```
  HINDARI FORMULA, HOOK, DAN ANALOGI BERIKUT (SUDAH PERNAH DITERBITKAN):
  1. "Hook 1..."
  2. "Hook 2..."
  Wajib buat sudut pandang, analogi, dan gaya pembuka yang sama sekali baru dan tidak mengulang kalimat di atas!
  ```
* **Auto-Retry Loop**:
  - Attempt up to 2 re-prompts if candidate fails freshness check.
  - Each retry appends explicit collision feedback: *"Draft sebelumnya terlalu mirip dengan hook '[matchedSnippet]'. Buat konsep yang 100% berbeda."*

### 3.4 `src/lib/rotation-engine.ts`
Intelligent scheduling & selection helper for products and angles.

* **Product LRU Selector**:
  - Reads active products and determines the least-recently generated/posted product:
    `score = now - lastDraftCreatedAt (or 0 if never drafted)`.
* **Angle Rotation**:
  - Reads the last 3 `hookAngle` values used for the target product.
  - Filters out recently used angles from the selection pool to ensure rich rotation (e.g. alternating between *Micro-Story*, *Price Breakdown*, *Contrarian*, *Productivity Hack*).

---

## 4. Threshold & Parameter Specification

| Parameter | Value | Rationale |
|---|---|---|
| **Lookback History Limit** | `10 drafts` | Sufficient to capture 2-4 weeks of active publishing without exceeding LLM context tokens. |
| **Lookback Time Window** | `30 days` | Content older than 30 days can have refreshed angles with new creative twists. |
| **Vector Cosine Similarity Threshold** | `0.70` | Embeddings from `nomic-embed-text-v2-moe` score ~0.75+ for semantically identical hooks and <0.60 for distinct angles. |
| **Lexical Jaccard Threshold** | `0.60` | Prevents direct phrasing / template duplication in fallback mode. |
| **Max Auto-Retry Attempts** | `2x` | Balances generation speed and guaranteed uniqueness. |
| **Embedding Request Timeout** | `4000ms` | Prevents API blocking if VPS embedding service is restarting or under load. |

---

## 5. Verification & Testing Strategy

### 5.1 Unit & Integration Tests (`vitest`)
1. **`embedding-client.test.ts`**:
   - Verify `cosineSimilarity` mathematical precision (orthogonal vectors = 0, identical = 1.0, opposite = -1.0).
   - Mock HTTP failure to verify timeout handling and null return.
2. **`content-deduplication.test.ts`**:
   - Verify lexical normalization and N-gram Jaccard score computation.
   - Test `validateDraftFreshness` with identical, similar, and distinct text pairs.
3. **`rotation-engine.test.ts`**:
   - Test LRU product selection with varying draft creation dates.
   - Test angle rotation avoiding last 3 used angles.
4. **`generation-engine.test.ts`**:
   - Verify negative context string generation in `buildGenerationPrompt`.
   - Verify retry mechanism triggers when freshness validator reports collision.

---

## 6. Deployment & Compatibility
- 100% backwards-compatible with existing schema (`prisma/schema.prisma`).
- Works across both local dev (`http://localhost:3000`) and production (`https://threads.hadestech.web.id`).
- Environment variables in `.env`:
  ```env
  OLLAMA_EMBED_BASE_URL="http://168.110.198.40:11434"
  OLLAMA_EMBED_MODEL="nomic-embed-text-v2-moe"
  ```
