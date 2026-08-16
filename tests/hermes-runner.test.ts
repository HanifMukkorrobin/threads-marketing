import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getOverview } from '../src/app/api/overview/route';
import { GET as getSettings, PUT as updateSettings, POST as handleSettingsAction } from '../src/app/api/settings/route';

describe('Task 7: Dashboard Overview, Settings API & Hermes Runner Integration', () => {
  beforeAll(async () => {
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
    await prisma.product.deleteMany();
    await prisma.systemConfig.deleteMany();
  });

  afterAll(async () => {
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
    await prisma.product.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/overview', () => {
    beforeEach(async () => {
      await prisma.draftPostItem.deleteMany();
      await prisma.contentDraft.deleteMany();
      await prisma.product.deleteMany();
      await prisma.systemConfig.deleteMany();

      // Seed 2 active products, 1 inactive product
      const p1 = await prisma.product.create({
        data: {
          name: 'Netflix 4K UHD',
          slug: 'netflix-4k-overview',
          category: 'Streaming',
          variants: JSON.stringify([{ name: '1 Bulan', price: 35000 }]),
          usp: JSON.stringify(['4K Ultra HD', 'Anti Hold']),
          isActive: true,
        },
      });

      const p2 = await prisma.product.create({
        data: {
          name: 'Spotify Premium 1 Bulan',
          slug: 'spotify-premium-overview',
          category: 'Music',
          variants: JSON.stringify([{ name: '1 Bulan', price: 20000 }]),
          usp: JSON.stringify(['No Ads', 'Offline Play']),
          isActive: true,
        },
      });

      await prisma.product.create({
        data: {
          name: 'Old Inactive Product',
          slug: 'old-inactive-overview',
          category: 'Archive',
          variants: JSON.stringify([{ name: '1 Bulan', price: 10000 }]),
          usp: JSON.stringify(['Legacy']),
          isActive: false,
        },
      });

      // Seed drafts in various states
      // 1. PENDING_REVIEW draft
      await prisma.contentDraft.create({
        data: {
          title: 'Review Hook Netflix',
          productId: p1.id,
          status: 'PENDING_REVIEW',
          hookAngle: 'Problem Agitate Solve',
          source: 'HERMES_AI',
          posts: {
            create: [
              { orderIndex: 0, content: 'Bosen nonton 720p buram? 🍿' },
              { orderIndex: 1, content: 'Ganti ke Netflix 4K UHD legal cuma 35rb!' },
            ],
          },
        },
      });

      // 2. APPROVED draft
      await prisma.contentDraft.create({
        data: {
          title: 'Approved Spotify Post',
          productId: p2.id,
          status: 'APPROVED',
          hookAngle: 'Price Comparison',
          source: 'HERMES_AI',
          posts: {
            create: [
              { orderIndex: 0, content: 'Denger musik kepotong iklan terus? 🎵' },
            ],
          },
        },
      });

      // 3. PUBLISHED draft
      await prisma.contentDraft.create({
        data: {
          title: 'Published Netflix Thread',
          productId: p1.id,
          status: 'PUBLISHED',
          hookAngle: 'Secret Hack',
          threadPostId: 'threads_post_999',
          threadPostUrl: 'https://threads.net/@tokodigital.id/post/999',
          publishedAt: new Date('2026-08-16T05:00:00Z'),
          posts: {
            create: [
              { orderIndex: 0, content: 'Cara legal nonton Netflix 4K cuma modal 35rb/bulan.' },
            ],
          },
        },
      });

      // 4. FAILED draft
      await prisma.contentDraft.create({
        data: {
          title: 'Failed Draft Post',
          productId: p2.id,
          status: 'FAILED',
          errorMessage: 'Threads API token expired',
          posts: {
            create: [
              { orderIndex: 0, content: 'Fail sample post' },
            ],
          },
        },
      });

      // System config
      await prisma.systemConfig.create({
        data: {
          key: 'HERMES_API_KEY',
          value: 'hermes-secret-key-overview-test',
        },
      });
    });

    it('returns aggregated metrics and draft collections correctly', async () => {
      const req = new NextRequest('http://localhost:3000/api/overview');
      const res = await getOverview(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const { counts, recentPendingDrafts, recentPublishedDrafts, hermesStatus } = json.data || json;

      // Check counts
      expect(counts.totalProducts).toBe(3);
      expect(counts.activeProducts).toBe(2);
      expect(counts.pendingDrafts).toBe(1);
      expect(counts.approvedDrafts).toBe(1);
      expect(counts.publishedDrafts).toBe(1);
      expect(counts.failedDrafts).toBe(1);
      expect(counts.totalDrafts).toBe(4);

      // Check recent pending drafts
      expect(recentPendingDrafts).toHaveLength(1);
      expect(recentPendingDrafts[0].title).toBe('Review Hook Netflix');
      expect(recentPendingDrafts[0].product.name).toBe('Netflix 4K UHD');
      expect(recentPendingDrafts[0].posts).toHaveLength(2);

      // Check recent published drafts
      expect(recentPublishedDrafts).toHaveLength(1);
      expect(recentPublishedDrafts[0].title).toBe('Published Netflix Thread');
      expect(recentPublishedDrafts[0].threadPostUrl).toBe('https://threads.net/@tokodigital.id/post/999');

      // Check Hermes status
      expect(hermesStatus.isConfigured).toBe(true);
      expect(hermesStatus.hasApiKey).toBe(true);
    });
  });

  describe('Settings API (`/api/settings`)', () => {
    beforeEach(async () => {
      await prisma.systemConfig.deleteMany();
    });

    it('GET /api/settings returns default configuration if DB is empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/settings');
      const res = await getSettings(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const settings = json.settings || json.data;

      expect(settings.HERMES_API_KEY).toBeDefined();
      expect(settings.STORE_NAME).toBeDefined();
      expect(settings.STORE_USERNAME).toBeDefined();
    });

    it('PUT /api/settings updates SystemConfig key-values correctly', async () => {
      const payload = {
        settings: {
          STORE_NAME: 'Mega Digital Store',
          STORE_USERNAME: 'megadigital.id',
          STORE_AVATAR_URL: 'https://images.unsplash.com/photo-store-avatar',
          HERMES_API_KEY: 'custom-hermes-key-xyz-777',
        },
      };

      const req = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await updateSettings(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const updated = json.settings || json.data;
      expect(updated.STORE_NAME).toBe('Mega Digital Store');
      expect(updated.STORE_USERNAME).toBe('megadigital.id');
      expect(updated.HERMES_API_KEY).toBe('custom-hermes-key-xyz-777');

      // Verify directly from DB
      const dbConfig = await prisma.systemConfig.findUnique({
        where: { key: 'STORE_NAME' },
      });
      expect(dbConfig?.value).toBe('Mega Digital Store');
    });

    it('POST /api/settings with action regenerate-key creates a new random key', async () => {
      const req = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate-key' }),
      });

      const res = await handleSettingsAction(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.apiKey).toMatch(/^hermes_[a-zA-Z0-9_-]+/);

      const dbKey = await prisma.systemConfig.findUnique({
        where: { key: 'HERMES_API_KEY' },
      });
      expect(dbKey?.value).toBe(json.apiKey);
    });
  });

  describe('Hermes Runner Simulation (`scripts/hermes-runner/hermes_mock_cron.ts`)', () => {
    it('executes generate and post flow against Hermes API', async () => {
      const { runHermesRunner } = await import('../scripts/hermes-runner/hermes_mock_cron');

      // Mock global fetch to test runner client communication
      const originalFetch = global.fetch;
      const fetchCalls: Array<{ url: string; method?: string; body?: string }> = [];

      try {
        global.fetch = async (input: any, init?: any) => {
          const url = typeof input === 'string' ? input : input.url;
          const method = init?.method || 'GET';
          const body = init?.body;
          fetchCalls.push({ url, method, body });

          if (url.includes('/api/hermes/products/active')) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                products: [
                  {
                    id: 'prod-test-1',
                    name: 'ChatGPT Plus Account',
                    slug: 'chatgpt-plus',
                    category: 'AI Tools',
                    variants: [{ name: '1 Bulan', price: 50000 }],
                    usp: ['Full Garansi', 'Private Chat'],
                    ctaTemplate: 'Klik bio untuk order!',
                  },
                ],
              }),
            } as any;
          }

          if (url.includes('/api/hermes/drafts/approved')) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                drafts: [
                  {
                    id: 'draft-approved-1',
                    title: 'Approved Post ChatGPT',
                    status: 'APPROVED',
                    type: 'THREAD_CHAIN',
                    posts: [{ orderIndex: 0, content: 'Beli ChatGPT legal disini!' }],
                  },
                ],
              }),
            } as any;
          }

          if (url.includes('/api/hermes/drafts') && method === 'POST') {
            return {
              ok: true,
              status: 201,
              json: async () => ({
                success: true,
                draft: { id: 'new-draft-123', status: 'PENDING_REVIEW' },
              }),
            } as any;
          }

          if (url.includes('/status') && method === 'PATCH') {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                draft: { id: 'draft-approved-1', status: 'PUBLISHED' },
              }),
            } as any;
          }

          return { ok: true, status: 200, json: async () => ({ success: true }) } as any;
        };

        const result = await runHermesRunner({
          baseUrl: 'http://localhost:3000',
          apiKey: 'hermes-secret-key-test',
          action: 'all',
        });

        expect(result.generatedCount).toBe(1);
        expect(result.publishedCount).toBe(1);
        expect(result.errors).toHaveLength(0);

        // Verify API calls were made with Authorization header
        expect(fetchCalls.length).toBeGreaterThanOrEqual(4);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

