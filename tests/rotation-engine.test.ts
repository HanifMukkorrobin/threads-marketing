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
