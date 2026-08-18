import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeTextForLexical,
  computeJaccardSimilarity,
  validateDraftFreshness,
  HistoricalDraftItem,
} from '../src/lib/content-deduplication';
import * as embeddingModule from '../src/lib/embedding-client';

describe('Content Deduplication & Freshness Guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
