# Content Deduplication & Freshness Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end Hybrid Content Deduplication, Negative Context Injection, Vector & Lexical Freshness Validation, and LRU Rotation Engine to guarantee zero duplicate/repetitive threads.

**Architecture:** Combine Ollama Vector Embedding (`nomic-embed-text-v2-moe` at `http://168.110.198.40:11434`) with Pure TypeScript Cosine Similarity, an N-gram Jaccard lexical fallback, SQLite rolling history lookback (last 10 published/approved posts), LLM negative context prompt injection, and a 2x auto-retry pipeline.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma ORM (SQLite `prod.db` / `dev.db` / `test.db`), Ollama Embed API (`nomic-embed-text-v2-moe`), Hermes AI Agent (`ag/gemini-3.6-flash-high`), Vitest.

**Spec:** [`docs/superpowers/specs/2026-08-18-content-deduplication-and-freshness-design.md`](file:///Users/tra-mac-020423/Documents/TraspacGitlab/research/threads-marketing/docs/superpowers/specs/2026-08-18-content-deduplication-and-freshness-design.md)

## Global Constraints

- Never break existing Prisma schema or truncate production catalogs.
- Zero external native binary dependencies for similarity; vector cosine calculation and lexical Jaccard must be 100% pure TypeScript.
- Embeddings use `http://168.110.198.40:11434/api/embed` with model `nomic-embed-text-v2-moe` and 4000ms fail-safe timeout.
- Vector Cosine Similarity Threshold = `0.70`; Lexical Jaccard Overlap Threshold = `0.60`.
- History lookback = last 10 `APPROVED` or `PUBLISHED` drafts (or rolling 30 days).
- Auto-retry on freshness collision = max 2 attempts with explicit contrast feedback.
- All unit and API tests must pass on Vitest (`DATABASE_URL="file:./test.db"`).

---

### Task 1: Ollama Embedding Client & Pure TypeScript Vector Math

**Files:**
- Create: `src/lib/embedding-client.ts`
- Test: `tests/embedding-client.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface EmbeddingResponse {
    embeddings: number[][];
    model: string;
  }
  export function cosineSimilarity(vecA: number[], vecB: number[]): number;
  export async function getBatchEmbeddings(texts: string[], baseUrl?: string, model?: string, timeoutMs?: number): Promise<number[][] | null>;
  ```

- [ ] **Step 1: Write the failing tests for cosine similarity and embedding client**

Create `tests/embedding-client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cosineSimilarity, getBatchEmbeddings } from '../src/lib/embedding-client';

describe('Embedding Client & Vector Math', () => {
  it('computes cosine similarity correctly for identical, orthogonal, and opposite vectors', () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];
    const v4 = [-1, 0, 0];

    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0, 5);
    expect(cosineSimilarity(v1, v4)).toBeCloseTo(-1.0, 5);
  });

  it('handles empty or mismatched vector dimensions gracefully', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
  });

  it('fetches batch embeddings from Ollama embedding API endpoint', async () => {
    const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ model: 'nomic-embed-text-v2-moe', embeddings: mockEmbeddings }),
    } as any);

    const res = await getBatchEmbeddings(['text 1', 'text 2'], 'http://mock-ollama:11434');
    expect(res).toEqual(mockEmbeddings);
  });

  it('returns null on network failure or timeout without throwing unhandled exceptions', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Connection refused'));
    const res = await getBatchEmbeddings(['text'], 'http://invalid-url:11434', 'nomic-embed-text-v2-moe', 500);
    expect(res).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/embedding-client.test.ts`
Expected: FAIL (module `src/lib/embedding-client` not found).

- [ ] **Step 3: Implement `src/lib/embedding-client.ts`**

Create `src/lib/embedding-client.ts`:
```typescript
/**
 * Ollama Embedding Client & High-Performance Vector Math
 * Targets nomic-embed-text-v2-moe on VPS
 */

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getBatchEmbeddings(
  texts: string[],
  baseUrl = process.env.OLLAMA_EMBED_BASE_URL || 'http://168.110.198.40:11434',
  model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text-v2-moe',
  timeoutMs = 4000
): Promise<number[][] | null> {
  if (!texts || texts.length === 0) return [];

  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const endpoint = `${cleanBaseUrl}/api/embed`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: texts }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Try legacy /api/embeddings fallback for single inputs if /api/embed is not available
      if (texts.length === 1) {
        const legacyRes = await fetch(`${cleanBaseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: texts[0] }),
        });
        if (legacyRes.ok) {
          const legJson = await legacyRes.json();
          if (legJson.embedding) return [legJson.embedding];
        }
      }
      return null;
    }

    const data = await res.json();
    if (data.embeddings && Array.isArray(data.embeddings)) {
      return data.embeddings;
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/embedding-client.test.ts`
Expected: PASS all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/embedding-client.ts tests/embedding-client.test.ts
git commit -m "feat(dedup): implement ollama embedding client and cosine similarity"
```

---

### Task 2: Lexical Token Overlap & Content Deduplication Orchestrator

**Files:**
- Create: `src/lib/content-deduplication.ts`
- Test: `tests/content-deduplication.test.ts`

**Interfaces:**
- Consumes: `cosineSimilarity`, `getBatchEmbeddings` from `src/lib/embedding-client.ts`, `prisma` from `src/lib/prisma.ts`
- Produces:
  ```typescript
  export interface HistoricalDraftItem {
    id: string;
    title: string;
    hookAngle?: string | null;
    hookContent: string;
    fullContent: string;
    publishedAt?: Date | null;
    createdAt: Date;
  }
  export interface FreshnessValidationResult {
    isFresh: boolean;
    score: number;
    threshold: number;
    method: 'vector' | 'lexical' | 'none';
    matchedSnippet?: string;
    reason?: string;
  }
  export function normalizeTextForLexical(text: string): string[];
  export function computeJaccardSimilarity(tokensA: string[], tokensB: string[], nGram?: number): number;
  export async function getRecentDraftHistory(productId?: string | null, limit?: number): Promise<HistoricalDraftItem[]>;
  export async function validateDraftFreshness(candidateHook: string, candidateFull: string, history: HistoricalDraftItem[]): Promise<FreshnessValidationResult>;
  ```

- [ ] **Step 1: Write failing tests for lexical analysis and hybrid freshness validation**

Create `tests/content-deduplication.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import {
  normalizeTextForLexical,
  computeJaccardSimilarity,
  validateDraftFreshness,
  HistoricalDraftItem,
} from '../src/lib/content-deduplication';
import * as embeddingModule from '../src/lib/embedding-client';

describe('Content Deduplication & Freshness Guard', () => {
  it('normalizes text and strips punctuation, urls, and common stopwords', () => {
    const text = 'Lagi asik nugas https://threads.net di malam hari? Cek info selengkapnya 🧵👇';
    const tokens = normalizeTextForLexical(text);
    expect(tokens).toContain('nugas');
    expect(tokens).toContain('malam');
    expect(tokens).not.toContain('https');
  });

  it('computes Jaccard similarity between identical and distinct token arrays', () => {
    const textA = normalizeTextForLexical('Banyak orang ngira langganan resmi itu mahal banget padahal hemat');
    const textB = normalizeTextForLexical('Banyak orang ngira langganan resmi itu mahal banget padahal hemat');
    const textC = normalizeTextForLexical('Tips produktivitas kerja remote dan shortcut laptop 2026');

    expect(computeJaccardSimilarity(textA, textB)).toBeCloseTo(1.0, 2);
    expect(computeJaccardSimilarity(textA, textC)).toBeLessThan(0.2);
  });

  it('flags candidate draft as duplicate when vector cosine similarity exceeds threshold 0.70', async () => {
    const history: HistoricalDraftItem[] = [
      {
        id: 'd1',
        title: 'Draft Lama',
        hookContent: 'Rahasia hemat langganan Canva Pro resmi tanpa kartu kredit 🧵👇',
        fullContent: 'Rahasia hemat langganan Canva Pro resmi...',
        createdAt: new Date(),
      },
    ];

    // Mock high vector similarity (0.85)
    vi.spyOn(embeddingModule, 'getBatchEmbeddings').mockResolvedValueOnce([
      [0.9, 0.1], // Candidate
      [0.85, 0.15], // History item
    ]);

    const result = await validateDraftFreshness(
      'Trik hemat langganan Canva Pro resmi tanpa ribet kartu kredit 🧵👇',
      'Trik hemat langganan Canva Pro...',
      history
    );

    expect(result.isFresh).toBe(false);
    expect(result.method).toBe('vector');
    expect(result.score).toBeGreaterThanOrEqual(0.70);
  });

  it('falls back to lexical Jaccard when embedding service is unreachable', async () => {
    const history: HistoricalDraftItem[] = [
      {
        id: 'd1',
        title: 'Draft Lama',
        hookContent: 'Banyak orang ngira langganan Netflix mahal padahal ada paket sharing resmi 🧵👇',
        fullContent: 'Banyak orang ngira langganan Netflix mahal...',
        createdAt: new Date(),
      },
    ];

    // Mock embedding failure
    vi.spyOn(embeddingModule, 'getBatchEmbeddings').mockResolvedValueOnce(null);

    // Test with nearly identical text
    const result = await validateDraftFreshness(
      'Banyak orang ngira langganan Netflix mahal padahal ada paket sharing resmi bergaransi 🧵👇',
      'Banyak orang ngira langganan Netflix mahal...',
      history
    );

    expect(result.method).toBe('lexical');
    expect(result.isFresh).toBe(false);
  });

  it('marks draft as fresh when history is empty', async () => {
    const result = await validateDraftFreshness('Hook baru', 'Full baru', []);
    expect(result.isFresh).toBe(true);
    expect(result.method).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/content-deduplication.test.ts`
Expected: FAIL (module `src/lib/content-deduplication` not found).

- [ ] **Step 3: Implement `src/lib/content-deduplication.ts`**

Create `src/lib/content-deduplication.ts`:
```typescript
/**
 * Content Deduplication & Freshness Guard
 * Combines Vector Semantic Embedding with N-gram Lexical Jaccard Fallback
 */

import { prisma } from './prisma';
import { cosineSimilarity, getBatchEmbeddings } from './embedding-client';

export interface HistoricalDraftItem {
  id: string;
  title: string;
  hookAngle?: string | null;
  hookContent: string;
  fullContent: string;
  publishedAt?: Date | null;
  createdAt: Date;
}

export interface FreshnessValidationResult {
  isFresh: boolean;
  score: number;
  threshold: number;
  method: 'vector' | 'lexical' | 'none';
  matchedSnippet?: string;
  reason?: string;
}

const INDONESIAN_STOPWORDS = new Set([
  'yang', 'untuk', 'pada', 'ke', 'para', 'namun', 'menurut', 'antara', 'dia', 'dua',
  'ia', 'seperti', 'jika', 'sehingga', 'kembali', 'dan', 'ini', 'karena', 'oleh',
  'saat', 'harus', 'kurang', 'kami', 'kamu', 'saya', 'adalah', 'akan', 'bisa', 'ada',
  'dari', 'dengan', 'di', 'gess', 'ya', 'dong', 'yuk', 'nih', 'lah', 'pun', 'itu',
]);

export function normalizeTextForLexical(text: string): string[] {
  if (!text) return [];
  const cleaned = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '') // remove urls
    .replace(/[🧵👇🚀✨💡🔥📦✅👉⚡️😤😩🤯🎉]/g, '') // remove common emojis
    .replace(/[^a-z0-9\s]/g, ' ') // remove symbols
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned
    .split(' ')
    .filter((w) => w.length > 2 && !INDONESIAN_STOPWORDS.has(w));
}

export function computeJaccardSimilarity(tokensA: string[], tokensB: string[], nGram = 2): number {
  if (!tokensA.length || !tokensB.length) return 0;

  const createNGrams = (tokens: string[], n: number): Set<string> => {
    const grams = new Set<string>();
    if (tokens.length < n) {
      tokens.forEach((t) => grams.add(t));
      return grams;
    }
    for (let i = 0; i <= tokens.length - n; i++) {
      grams.add(tokens.slice(i, i + n).join(' '));
    }
    return grams;
  };

  const setA = createNGrams(tokensA, nGram);
  const setB = createNGrams(tokensB, nGram);

  let intersection = 0;
  setA.forEach((item) => {
    if (setB.has(item)) intersection++;
  });

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export async function getRecentDraftHistory(
  productId?: string | null,
  limit = 10
): Promise<HistoricalDraftItem[]> {
  try {
    const whereClause: any = {
      status: { in: ['APPROVED', 'PUBLISHED'] },
    };

    if (productId) {
      whereClause.productId = productId;
    } else {
      whereClause.productId = null;
    }

    const drafts = await prisma.contentDraft.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        posts: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return drafts.map((d) => {
      const hookPost = d.posts.find((p) => p.orderIndex === 0) || d.posts[0];
      const hookContent = hookPost ? hookPost.content : d.title;
      const fullContent = d.posts.map((p) => p.content).join('\n\n');

      return {
        id: d.id,
        title: d.title,
        hookAngle: d.hookAngle,
        hookContent,
        fullContent,
        publishedAt: d.publishedAt,
        createdAt: d.createdAt,
      };
    });
  } catch (error) {
    console.warn('Failed to query draft history for deduplication:', error);
    return [];
  }
}

export async function validateDraftFreshness(
  candidateHook: string,
  candidateFull: string,
  history: HistoricalDraftItem[]
): Promise<FreshnessValidationResult> {
  if (!history || history.length === 0) {
    return {
      isFresh: true,
      score: 0,
      threshold: 0.70,
      method: 'none',
    };
  }

  const VECTOR_THRESHOLD = 0.70;
  const LEXICAL_THRESHOLD = 0.60;

  // 1. Try Vector Semantic Embedding Check
  const textsToEmbed = [candidateHook, ...history.map((h) => h.hookContent)];
  const embeddings = await getBatchEmbeddings(textsToEmbed);

  if (embeddings && embeddings.length === textsToEmbed.length) {
    const candidateVec = embeddings[0];
    let maxSim = 0;
    let mostSimilarItem: HistoricalDraftItem | undefined;

    for (let i = 1; i < embeddings.length; i++) {
      const histVec = embeddings[i];
      const sim = cosineSimilarity(candidateVec, histVec);
      if (sim > maxSim) {
        maxSim = sim;
        mostSimilarItem = history[i - 1];
      }
    }

    const isFresh = maxSim < VECTOR_THRESHOLD;
    return {
      isFresh,
      score: Number(maxSim.toFixed(4)),
      threshold: VECTOR_THRESHOLD,
      method: 'vector',
      matchedSnippet: mostSimilarItem ? mostSimilarItem.hookContent.slice(0, 100) : undefined,
      reason: isFresh
        ? 'Lolos uji kesegaran semantik vektor.'
        : `Terlalu mirip secara semantik (${(maxSim * 100).toFixed(1)}%) dengan draft: "${mostSimilarItem?.hookContent.slice(0, 80)}..."`,
    };
  }

  // 2. Fallback to N-Gram Lexical Jaccard Overlap
  const candidateTokens = normalizeTextForLexical(candidateHook);
  let maxLexical = 0;
  let mostSimilarLexicalItem: HistoricalDraftItem | undefined;

  for (const item of history) {
    const histTokens = normalizeTextForLexical(item.hookContent);
    const score2Gram = computeJaccardSimilarity(candidateTokens, histTokens, 2);
    const score3Gram = computeJaccardSimilarity(candidateTokens, histTokens, 3);
    const combinedScore = score2Gram * 0.6 + score3Gram * 0.4;

    if (combinedScore > maxLexical) {
      maxLexical = combinedScore;
      mostSimilarLexicalItem = item;
    }
  }

  const isFreshLexical = maxLexical < LEXICAL_THRESHOLD;
  return {
    isFresh: isFreshLexical,
    score: Number(maxLexical.toFixed(4)),
    threshold: LEXICAL_THRESHOLD,
    method: 'lexical',
    matchedSnippet: mostSimilarLexicalItem ? mostSimilarLexicalItem.hookContent.slice(0, 100) : undefined,
    reason: isFreshLexical
      ? 'Lolos uji kesegaran leksikal.'
      : `Terdeteksi kemiripan kata (${(maxLexical * 100).toFixed(1)}%) dengan draft: "${mostSimilarLexicalItem?.hookContent.slice(0, 80)}..."`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/content-deduplication.test.ts`
Expected: PASS all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content-deduplication.ts tests/content-deduplication.test.ts
git commit -m "feat(dedup): implement content deduplication and hybrid freshness validator"
```

---

### Task 3: Intelligent Product & Angle Rotation Engine

**Files:**
- Create: `src/lib/rotation-engine.ts`
- Test: `tests/rotation-engine.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface ProductStaleness {
    productId: string;
    productName: string;
    lastDraftAt: Date | null;
    stalenessMinutes: number;
  }
  export function selectLRUProduct<T extends { id: string; name: string }>(products: T[], recentDrafts: Array<{ productId: string | null; createdAt: Date }>): T | null;
  export function selectRotatedAngle(allAngles: string[], recentAngles: string[]): string;
  ```

- [ ] **Step 1: Write failing tests for LRU rotation logic**

Create `tests/rotation-engine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { selectLRUProduct, selectRotatedAngle } from '../src/lib/rotation-engine';

describe('Rotation Engine', () => {
  it('selects the product with no previous drafts or the oldest draft timestamp (LRU)', () => {
    const products = [
      { id: 'p1', name: 'Netflix Premium' },
      { id: 'p2', name: 'Canva Pro' },
      { id: 'p3', name: 'Spotify Individual' },
    ];

    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 1000);

    const drafts = [
      { productId: 'p1', createdAt: tenMinAgo },
      { productId: 'p2', createdAt: twoDaysAgo },
      // p3 has no drafts
    ];

    // p3 should be chosen first because it has never been drafted
    const selected1 = selectLRUProduct(products, drafts);
    expect(selected1?.id).toBe('p3');

    // If p3 is drafted, p2 should be chosen over p1 because p2 is older
    const draftsWithP3 = [
      ...drafts,
      { productId: 'p3', createdAt: new Date() },
    ];
    const selected2 = selectLRUProduct(products, draftsWithP3);
    expect(selected2?.id).toBe('p2');
  });

  it('rotates angles and avoids the last recently used angles', () => {
    const allAngles = ['contrarian', 'micro_story', 'price_breakdown', 'productivity_hack', 'fomo_urgency'];
    const recentAngles = ['contrarian', 'micro_story'];

    const chosen = selectRotatedAngle(allAngles, recentAngles);
    expect(['price_breakdown', 'productivity_hack', 'fomo_urgency']).toContain(chosen);
  });

  it('falls back to any available angle when all angles have been recently used', () => {
    const allAngles = ['contrarian', 'micro_story'];
    const recentAngles = ['contrarian', 'micro_story'];

    const chosen = selectRotatedAngle(allAngles, recentAngles);
    expect(allAngles).toContain(chosen);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/rotation-engine.test.ts`
Expected: FAIL (module `src/lib/rotation-engine` not found).

- [ ] **Step 3: Implement `src/lib/rotation-engine.ts`**

Create `src/lib/rotation-engine.ts`:
```typescript
/**
 * Intelligent LRU Product & Angle Rotation Engine
 */

export function selectLRUProduct<T extends { id: string; name: string }>(
  products: T[],
  recentDrafts: Array<{ productId: string | null; createdAt: Date }>
): T | null {
  if (!products || products.length === 0) return null;

  const lastDraftMap = new Map<string, number>();

  for (const draft of recentDrafts) {
    if (draft.productId) {
      const time = new Date(draft.createdAt).getTime();
      const existing = lastDraftMap.get(draft.productId);
      if (!existing || time > existing) {
        lastDraftMap.set(draft.productId, time);
      }
    }
  }

  let oldestTime = Infinity;
  let candidate: T = products[0];

  for (const p of products) {
    const lastTime = lastDraftMap.get(p.id);
    if (lastTime === undefined) {
      // Never drafted, maximum priority
      return p;
    }
    if (lastTime < oldestTime) {
      oldestTime = lastTime;
      candidate = p;
    }
  }

  return candidate;
}

export function selectRotatedAngle(allAngles: string[], recentAngles: string[]): string {
  if (!allAngles || allAngles.length === 0) return 'contrarian';
  if (!recentAngles || recentAngles.length === 0) {
    return allAngles[Math.floor(Math.random() * allAngles.length)];
  }

  const recentSet = new Set(recentAngles.slice(0, Math.min(3, allAngles.length - 1)));
  const available = allAngles.filter((a) => !recentSet.has(a));

  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  return allAngles[Math.floor(Math.random() * allAngles.length)];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/rotation-engine.test.ts`
Expected: PASS all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rotation-engine.ts tests/rotation-engine.test.ts
git commit -m "feat(dedup): implement lru product and angle rotation engine"
```

---

### Task 4: Negative Prompt Injection & Auto-Retry Loop in Generation Engine

**Files:**
- Modify: `src/lib/generation-engine.ts`
- Test: `tests/generation-engine.test.ts`

**Interfaces:**
- Consumes: `validateDraftFreshness`, `getRecentDraftHistory` from `src/lib/content-deduplication.ts`
- Updates:
  ```typescript
  export interface GenerationInput {
    // ... existing fields
    historyHooksToAvoid?: string[];
    excludeCollisions?: string[];
  }
  export function buildGenerationPrompt(input: GenerationInput): string;
  export async function generateDraftWithHermes(input: GenerationInput): Promise<GenerationResult>;
  ```

- [ ] **Step 1: Write tests for negative context formatting and retry freshness loop**

Update `tests/generation-engine.test.ts` with new negative context and validation tests:
```typescript
it('injects negative historical hooks to avoid into prompt when provided', () => {
  const prompt = buildGenerationPrompt({
    product: { name: 'Canva Pro' },
    store: { name: 'Toko Digital' },
    historyHooksToAvoid: [
      'Banyak orang ngira langganan resmi mahal 🧵👇',
      'Trik rahasia beresin tugas desain dalam 5 menit 🧵👇',
    ],
  });

  expect(prompt).toContain('HINDARI FORMULA & HOOK SEBELUMNYA (NEGATIVE CONTEXT)');
  expect(prompt).toContain('Banyak orang ngira langganan resmi mahal');
  expect(prompt).toContain('Trik rahasia beresin tugas desain');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generation-engine.test.ts`
Expected: FAIL (section `HINDARI FORMULA & HOOK SEBELUMNYA` not yet in `buildGenerationPrompt`).

- [ ] **Step 3: Update `src/lib/generation-engine.ts`**

Integrate `historyHooksToAvoid`, `getRecentDraftHistory`, `validateDraftFreshness`, and auto-retry loop into `src/lib/generation-engine.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generation-engine.test.ts`
Expected: PASS all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/generation-engine.ts tests/generation-engine.test.ts
git commit -m "feat(dedup): integrate negative context prompt injection and auto-retry freshness loop"
```

---

### Task 5: Integration in UI Generation API & Background Cron Runner

**Files:**
- Modify: `src/app/api/drafts/generate/route.ts`
- Modify: `scripts/hermes-runner/hermes_mock_cron.ts`
- Test: `tests/hermes-runner.test.ts`

- [ ] **Step 1: Write integration tests for API and Runner rotation**

Verify that `GET /api/drafts/generate` or `POST /api/drafts/generate` passes historical lookback hooks to the engine and records `metadata.freshnessCheck`.

- [ ] **Step 2: Run test to verify it fails before modification**

Run: `npx vitest run tests/hermes-runner.test.ts`

- [ ] **Step 3: Update API routes & Cron Runner**

In `src/app/api/drafts/generate/route.ts`:
- Fetch recent history for the target product via `getRecentDraftHistory(productId)`.
- Pass hooks to `generateDraftWithHermes`.
- Record freshness check details in draft `metadata`.

In `scripts/hermes-runner/hermes_mock_cron.ts`:
- Use `selectLRUProduct` to pick products that haven't had recent drafts.
- Rotate angles using `selectRotatedAngle`.
- Perform freshness verification before submitting to `/api/hermes/drafts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hermes-runner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/drafts/generate/route.ts scripts/hermes-runner/hermes_mock_cron.ts tests/hermes-runner.test.ts
git commit -m "feat(dedup): connect lru rotation and freshness guard to api and cron runner"
```

---

### Task 6: Full Verification & E2E Validation

**Files:**
- Verify: `tests/e2e-workflow.test.ts`
- Verify: all 15+ test suites in `tests/*.test.ts`

- [ ] **Step 1: Run full Vitest test suite**

Run: `npm test`
Expected: All test suites PASS with zero failures.

- [ ] **Step 2: Verify Hermes runner CLI in mock mode**

Run: `npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=generate`
Expected: Logs show LRU product selection, negative context assembly, and freshness validation passing.

- [ ] **Step 3: Final Commit**

```bash
git commit --allow-empty -m "chore: complete phase 1 content deduplication and freshness engine implementation"
```
