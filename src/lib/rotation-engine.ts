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
