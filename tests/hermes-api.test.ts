import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { validateHermesApiKey, unauthorizedResponse } from '../src/lib/auth';
import { GET as getActiveProducts } from '../src/app/api/hermes/products/active/route';
import { POST as createDraft } from '../src/app/api/hermes/drafts/route';
import { GET as getApprovedDrafts } from '../src/app/api/hermes/drafts/approved/route';
import { PATCH as updateDraftStatus } from '../src/app/api/hermes/drafts/[id]/status/route';

describe('Hermes Agent REST API & Auth Middleware', () => {
  const DEFAULT_KEY = 'hermes-secret-key-2026';

  beforeAll(async () => {
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
    await prisma.product.deleteMany();
    await prisma.systemConfig.deleteMany();

    await prisma.systemConfig.create({
      data: {
        key: 'HERMES_API_KEY',
        value: DEFAULT_KEY,
        description: 'Hermes secret key for tests',
      },
    });
  });

  afterAll(async () => {
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
    await prisma.product.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.$disconnect();
  });

  describe('Auth Middleware Helper (`src/lib/auth.ts`)', () => {
    it('validates Authorization: Bearer <KEY> header correctly', async () => {
      const validReq = new NextRequest('http://localhost:3000/api/hermes/products/active', {
        headers: { authorization: `Bearer ${DEFAULT_KEY}` },
      });
      const isValid = await validateHermesApiKey(validReq);
      expect(isValid).toBe(true);

      const invalidReq = new NextRequest('http://localhost:3000/api/hermes/products/active', {
        headers: { authorization: 'Bearer wrong-key' },
      });
      const isInvalid = await validateHermesApiKey(invalidReq);
      expect(isInvalid).toBe(false);
    });

    it('validates x-api-key header correctly', async () => {
      const validReq = new NextRequest('http://localhost:3000/api/hermes/products/active', {
        headers: { 'x-api-key': DEFAULT_KEY },
      });
      const isValid = await validateHermesApiKey(validReq);
      expect(isValid).toBe(true);
    });

    it('returns false for missing auth headers', async () => {
      const emptyReq = new NextRequest('http://localhost:3000/api/hermes/products/active');
      const isValid = await validateHermesApiKey(emptyReq);
      expect(isValid).toBe(false);
    });

    it('unauthorizedResponse returns 401 JSON response', async () => {
      const res = unauthorizedResponse();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Unauthorized');
    });
  });

  describe('GET /api/hermes/products/active', () => {
    let activeProduct: any;
    let inactiveProduct: any;

    beforeEach(async () => {
      await prisma.product.deleteMany();

      activeProduct = await prisma.product.create({
        data: {
          name: 'YouTube Premium Active',
          slug: 'yt-premium-active',
          category: 'Streaming Video',
          description: 'Aktivasi langsung email',
          variants: JSON.stringify([{ name: '1 Bulan', price: 25000, duration: '30 hari' }]),
          usp: JSON.stringify(['Garansi 30 Hari', 'No VPN']),
          targetAudience: 'Penikmat video',
          toneOfVoice: 'Santai & Edukatif',
          ctaTemplate: 'Order via link di bio!',
          isActive: true,
        },
      });

      inactiveProduct = await prisma.product.create({
        data: {
          name: 'Old Spotify Inactive',
          slug: 'spotify-inactive',
          category: 'Music',
          variants: JSON.stringify([{ name: '1 Bulan', price: 20000, duration: '30 hari' }]),
          usp: JSON.stringify(['Garansi']),
          isActive: false,
        },
      });
    });

    it('rejects unauthorized request with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/hermes/products/active');
      const res = await getActiveProducts(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('returns only active products with parsed variants and usp arrays', async () => {
      const req = new NextRequest('http://localhost:3000/api/hermes/products/active', {
        headers: { authorization: `Bearer ${DEFAULT_KEY}` },
      });
      const res = await getActiveProducts(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const products = json.products || json.data;
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('YouTube Premium Active');
      expect(Array.isArray(products[0].variants)).toBe(true);
      expect(products[0].variants[0].name).toBe('1 Bulan');
      expect(products[0].variants[0].price).toBe(25000);
      expect(Array.isArray(products[0].usp)).toBe(true);
      expect(products[0].usp).toContain('Garansi 30 Hari');
    });
  });

  describe('POST /api/hermes/drafts', () => {
    let testProduct: any;

    beforeEach(async () => {
      await prisma.draftPostItem.deleteMany();
      await prisma.contentDraft.deleteMany();
      await prisma.product.deleteMany();

      testProduct = await prisma.product.create({
        data: {
          name: 'Netflix Premium UHD',
          slug: 'netflix-uhd-test',
          category: 'Streaming Video',
          variants: JSON.stringify([{ name: '1 Bulan', price: 35000 }]),
          usp: JSON.stringify(['4K UHD', 'Anti-Hold']),
          isActive: true,
        },
      });
    });

    it('rejects unauthenticated request with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/hermes/drafts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Draft', posts: [] }),
      });
      const res = await createDraft(req);
      expect(res.status).toBe(401);
    });

    it('creates draft with PENDING_REVIEW status, HERMES_AI source, and nested posts', async () => {
      const payload = {
        productId: testProduct.id,
        title: 'Nonton Netflix 4K Legal Cuma 35rb?',
        type: 'THREAD_CHAIN',
        hookAngle: 'Cost Comparison',
        posts: [
          {
            orderIndex: 0,
            content: 'Capek bayar 186rb sendirian? Ini trik nonton 4K UHD cuma 35rb! 🧵👇',
          },
          {
            orderIndex: 1,
            content: 'Pakai akun sharing resmi bergaransi 30 hari penuh, PIN profil pribadi.',
          },
          {
            orderIndex: 2,
            content: 'Tertarik? Klik link di bio untuk order instan sekarang!',
          },
        ],
        metadata: {
          model: 'hermes-3-70b',
          tokens: 280,
        },
      };

      const req = new NextRequest('http://localhost:3000/api/hermes/drafts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${DEFAULT_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const res = await createDraft(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      const draft = json.draft || json.data;
      expect(draft.id).toBeDefined();
      expect(draft.title).toBe(payload.title);
      expect(draft.status).toBe('PENDING_REVIEW');
      expect(draft.source).toBe('HERMES_AI');
      expect(draft.hookAngle).toBe('Cost Comparison');
      expect(draft.posts).toHaveLength(3);
      expect(draft.posts[0].orderIndex).toBe(0);
      expect(draft.posts[0].content).toContain('Capek bayar 186rb');

      // Verify directly in DB
      const dbDraft = await prisma.contentDraft.findUnique({
        where: { id: draft.id },
        include: { posts: { orderBy: { orderIndex: 'asc' } }, product: true },
      });
      expect(dbDraft).not.toBeNull();
      expect(dbDraft?.status).toBe('PENDING_REVIEW');
      expect(dbDraft?.product?.name).toBe('Netflix Premium UHD');
      expect(dbDraft?.posts).toHaveLength(3);
    });

    it('handles single post draft creation without product', async () => {
      const payload = {
        title: 'Tips Produktivitas Digital',
        type: 'SINGLE',
        posts: [
          {
            orderIndex: 0,
            content: '5 tools wajib buat ningkatin produktivitas kerja remote di 2026...',
          },
        ],
      };

      const req = new NextRequest('http://localhost:3000/api/hermes/drafts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': DEFAULT_KEY,
        },
        body: JSON.stringify(payload),
      });

      const res = await createDraft(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      const draft = json.draft || json.data;
      expect(draft.productId).toBeNull();
      expect(draft.posts).toHaveLength(1);
    });
  });

  describe('GET /api/hermes/drafts/approved', () => {
    beforeEach(async () => {
      await prisma.draftPostItem.deleteMany();
      await prisma.contentDraft.deleteMany();
      await prisma.product.deleteMany();

      // 1. Pending draft (should NOT be returned)
      await prisma.contentDraft.create({
        data: {
          title: 'Pending Draft',
          status: 'PENDING_REVIEW',
          posts: { create: [{ orderIndex: 0, content: 'Pending post content' }] },
        },
      });

      // 2. Approved draft (SHOULD be returned)
      await prisma.contentDraft.create({
        data: {
          title: 'Approved Ready Draft',
          status: 'APPROVED',
          type: 'THREAD_CHAIN',
          posts: {
            create: [
              { orderIndex: 0, content: 'Approved part 1' },
              { orderIndex: 1, content: 'Approved part 2' },
            ],
          },
        },
      });

      // 3. Published draft (should NOT be returned)
      await prisma.contentDraft.create({
        data: {
          title: 'Already Published Draft',
          status: 'PUBLISHED',
          posts: { create: [{ orderIndex: 0, content: 'Published post content' }] },
        },
      });
    });

    it('rejects unauthenticated request with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/hermes/drafts/approved');
      const res = await getApprovedDrafts(req);
      expect(res.status).toBe(401);
    });

    it('returns only approved drafts with nested ordered posts', async () => {
      const req = new NextRequest('http://localhost:3000/api/hermes/drafts/approved', {
        headers: { authorization: `Bearer ${DEFAULT_KEY}` },
      });
      const res = await getApprovedDrafts(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const drafts = json.drafts || json.data;
      expect(drafts).toHaveLength(1);
      expect(drafts[0].title).toBe('Approved Ready Draft');
      expect(drafts[0].status).toBe('APPROVED');
      expect(drafts[0].posts).toHaveLength(2);
      expect(drafts[0].posts[0].orderIndex).toBe(0);
      expect(drafts[0].posts[0].content).toBe('Approved part 1');
      expect(drafts[0].posts[1].orderIndex).toBe(1);
      expect(drafts[0].posts[1].content).toBe('Approved part 2');
    });
  });

  describe('PATCH /api/hermes/drafts/[id]/status', () => {
    let targetDraft: any;

    beforeEach(async () => {
      await prisma.draftPostItem.deleteMany();
      await prisma.contentDraft.deleteMany();

      targetDraft = await prisma.contentDraft.create({
        data: {
          title: 'Draft for Status Update',
          status: 'APPROVED',
          posts: {
            create: [{ orderIndex: 0, content: 'Post to publish' }],
          },
        },
      });
    });

    it('rejects unauthenticated request with 401', async () => {
      const req = new NextRequest(`http://localhost:3000/api/hermes/drafts/${targetDraft.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      const res = await updateDraftStatus(req, { params: { id: targetDraft.id } });
      expect(res.status).toBe(401);
    });

    it('updates status to PUBLISHED and records threadPostId and threadPostUrl', async () => {
      const payload = {
        status: 'PUBLISHED',
        threadPostId: 'threads_post_123456',
        threadPostUrl: 'https://threads.net/@store/post/123456',
      };

      const req = new NextRequest(`http://localhost:3000/api/hermes/drafts/${targetDraft.id}/status`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${DEFAULT_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const res = await updateDraftStatus(req, { params: { id: targetDraft.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const updated = json.draft || json.data;
      expect(updated.status).toBe('PUBLISHED');
      expect(updated.threadPostId).toBe('threads_post_123456');
      expect(updated.threadPostUrl).toBe('https://threads.net/@store/post/123456');
      expect(updated.publishedAt).toBeDefined();

      const dbDraft = await prisma.contentDraft.findUnique({
        where: { id: targetDraft.id },
      });
      expect(dbDraft?.status).toBe('PUBLISHED');
      expect(dbDraft?.publishedAt).not.toBeNull();
      expect(dbDraft?.threadPostUrl).toBe('https://threads.net/@store/post/123456');
    });

    it('updates status to FAILED and records errorMessage', async () => {
      const payload = {
        status: 'FAILED',
        errorMessage: 'Threads Graph API rate limit exceeded (code 429)',
      };

      const req = new NextRequest(`http://localhost:3000/api/hermes/drafts/${targetDraft.id}/status`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-api-key': DEFAULT_KEY,
        },
        body: JSON.stringify(payload),
      });

      const res = await updateDraftStatus(req, { params: { id: targetDraft.id } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const updated = json.draft || json.data;
      expect(updated.status).toBe('FAILED');
      expect(updated.errorMessage).toBe('Threads Graph API rate limit exceeded (code 429)');

      const dbDraft = await prisma.contentDraft.findUnique({
        where: { id: targetDraft.id },
      });
      expect(dbDraft?.status).toBe('FAILED');
      expect(dbDraft?.errorMessage).toBe('Threads Graph API rate limit exceeded (code 429)');
    });

    it('returns 400 for invalid status value', async () => {
      const req = new NextRequest(`http://localhost:3000/api/hermes/drafts/${targetDraft.id}/status`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${DEFAULT_KEY}`,
        },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });

      const res = await updateDraftStatus(req, { params: { id: targetDraft.id } });
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent draft id', async () => {
      const req = new NextRequest('http://localhost:3000/api/hermes/drafts/nonexistent-id/status', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${DEFAULT_KEY}`,
        },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });

      const res = await updateDraftStatus(req, { params: { id: 'nonexistent-id' } });
      expect(res.status).toBe(404);
    });
  });
});
