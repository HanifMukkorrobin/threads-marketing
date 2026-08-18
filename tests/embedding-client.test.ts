import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cosineSimilarity, getBatchEmbeddings } from '../src/lib/embedding-client';

describe('Embedding Client & Vector Math', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
