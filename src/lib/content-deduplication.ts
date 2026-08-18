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
      reason: 'Belum ada riwayat postingan sebelumnya (100% fresh).',
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
