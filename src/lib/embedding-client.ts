/**
 * Ollama Embedding Client & High-Performance Vector Math
 * Targets nomic-embed-text-v2-moe on VPS (http://168.110.198.40:11434)
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
