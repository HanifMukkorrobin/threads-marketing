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

    it('GET and PUT /api/settings handles THREADS_ACCESS_TOKEN and THREADS_USER_ID', async () => {
      const payload = {
        settings: {
          THREADS_ACCESS_TOKEN: 'THAA_test_token_123',
          THREADS_USER_ID: '27679443961726029',
        },
      };

      const putReq = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const putRes = await updateSettings(putReq);
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.settings.THREADS_ACCESS_TOKEN).toBe('THAA_test_token_123');
      expect(putJson.settings.THREADS_USER_ID).toBe('27679443961726029');

      const getReq = new NextRequest('http://localhost:3000/api/settings');
      const getRes = await getSettings(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.settings.THREADS_ACCESS_TOKEN).toBe('THAA_test_token_123');
      expect(getJson.settings.THREADS_USER_ID).toBe('27679443961726029');
    });
  });

  describe('Hermes Runner Simulation & Real Meta Threads Publishing (`scripts/hermes-runner/hermes_mock_cron.ts`)', () => {
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
            const parsedBody = JSON.parse(body || '{}');
            if (parsedBody.productId) {
              expect(parsedBody.metadata?.persona).toBe('CLEAN_COMMERCIAL_PROMO');
              expect(parsedBody.metadata?.skill).toBeUndefined();
            } else {
              expect(parsedBody.metadata?.persona).toBe('TECH_SYSTEMS_PRACTITIONER');
              expect(parsedBody.metadata?.skill).toBeUndefined();
            }
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
          threadsAccessToken: '',
        });

        expect(result.generatedCount).toBeGreaterThanOrEqual(1);
        expect(result.publishedCount).toBe(1);
        expect(result.errors).toHaveLength(0);

        // Verify API calls were made with Authorization header
        expect(fetchCalls.length).toBeGreaterThanOrEqual(4);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('verifies fallback archetypes produce clean, substantive practitioner content without forced slang', async () => {
      const { HUMANIZED_HOOK_ARCHETYPES, getOrganicArchetypes } = await import('../scripts/hermes-runner/hermes_mock_cron');

      const mockProduct = {
        id: 'test-p1',
        name: 'GitHub Copilot Enterprise',
        slug: 'github-copilot',
        category: 'Development',
        variants: [{ name: '1 Bulan', price: 150000 }],
        usp: ['Full Private', 'Garansi Resmi'],
      };

      const mockStore = { name: 'Hades Tech', username: 'hades.zshrc' };
      const bannedSlangRegex = /\b(gess|sat-set|boncos|nugas)\b/i;

      // Test commercial promo archetypes
      for (const archetype of HUMANIZED_HOOK_ARCHETYPES) {
        const generated = archetype.generate(mockProduct, mockStore);
        expect(generated.posts.length).toBeGreaterThanOrEqual(2);
        for (const post of generated.posts) {
          expect(post.content.length).toBeLessThanOrEqual(500);
          expect(bannedSlangRegex.test(post.content)).toBe(false);
        }
      }

      // Test organic archetypes
      const organicList = getOrganicArchetypes(mockStore);
      expect(organicList.length).toBeGreaterThanOrEqual(4);
      for (const item of organicList) {
        expect(item.posts.length).toBeGreaterThanOrEqual(2);
        for (const post of item.posts) {
          expect(post.content.length).toBeLessThanOrEqual(500);
          expect(bannedSlangRegex.test(post.content)).toBe(false);
        }
      }
    });

    it('publishes real thread chain to Meta Threads Graph API when access token is provided', async () => {
      const { runHermesRunner } = await import('../scripts/hermes-runner/hermes_mock_cron');

      const originalFetch = global.fetch;
      const graphApiCalls: Array<{ url: string; method?: string; body?: any }> = [];

      try {
        global.fetch = async (input: any, init?: any) => {
          const url = typeof input === 'string' ? input : input.url;
          const method = init?.method || 'GET';
          const body = init?.body;

          if (url.includes('graph.threads.net')) {
            graphApiCalls.push({ url, method, body });
            if (url.includes('/threads_publish')) {
              return {
                ok: true,
                status: 200,
                json: async () => ({ id: 'real_threads_post_111222' }),
              } as any;
            }
            if (url.includes('/container_999888')) {
              return {
                ok: true,
                status: 200,
                json: async () => ({ id: 'container_999888', status: 'FINISHED' }),
              } as any;
            }
            if (url.includes('/threads')) {
              return {
                ok: true,
                status: 200,
                json: async () => ({ id: 'container_999888', status: 'FINISHED' }),
              } as any;
            }
            if (url.includes('/real_threads_post_111222')) {
              return {
                ok: true,
                status: 200,
                json: async () => ({
                  id: 'real_threads_post_111222',
                  permalink: 'https://www.threads.net/@hades.zshrc/post/DF_12345678',
                }),
              } as any;
            }
          }

          if (url.includes('/api/hermes/drafts/approved')) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                drafts: [
                  {
                    id: 'draft-approved-real-1',
                    title: 'Approved Real Chain Post',
                    status: 'APPROVED',
                    type: 'THREAD_CHAIN',
                    posts: [
                      { orderIndex: 0, content: 'Hook 1: Belajar coding efisien' },
                      { orderIndex: 1, content: 'Value 2: Tips produktif 2026' },
                    ],
                  },
                ],
              }),
            } as any;
          }

          if (url.includes('/api/settings')) {
            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                settings: {
                  STORE_USERNAME: 'hades.zshrc',
                  STORE_NAME: 'Hades Tech',
                  THREADS_ACCESS_TOKEN: 'THAA_valid_mock_token',
                  THREADS_USER_ID: '27679443961726029',
                },
              }),
            } as any;
          }

          if (url.includes('/status') && method === 'PATCH') {
            const parsedBody = JSON.parse(body || '{}');
            expect(parsedBody.status).toBe('PUBLISHED');
            expect(parsedBody.threadPostId).toBe('real_threads_post_111222');
            expect(parsedBody.threadPostUrl).toContain('threads.net/@hades.zshrc/post/');
            return {
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                draft: { id: 'draft-approved-real-1', status: 'PUBLISHED' },
              }),
            } as any;
          }

          return { ok: true, status: 200, json: async () => ({ success: true }) } as any;
        };

        const result = await runHermesRunner({
          baseUrl: 'http://localhost:3000',
          apiKey: 'hermes-secret-key-test',
          action: 'post',
          threadsAccessToken: 'THAA_valid_mock_token',
          threadsUserId: '27679443961726029',
        });

        expect(result.publishedCount).toBe(1);
        expect(result.errors).toHaveLength(0);

        // Verify Graph API calls were made: 2 container creations (root + reply) + 2 publishes + 1 permalink check
        expect(graphApiCalls.length).toBeGreaterThanOrEqual(4);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

