import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getDrafts, POST as createDraft } from '../src/app/api/drafts/route';
import {
  GET as getDraftById,
  PUT as updateDraft,
  PATCH as patchDraft,
  DELETE as deleteDraft,
} from '../src/app/api/drafts/[id]/route';
import {
  GET as getDraftStatus,
  PATCH as patchDraftStatus,
} from '../src/app/api/drafts/[id]/status/route';

describe('Content Drafts Internal API Routes (`/api/drafts`)', () => {
  let sampleProduct1: any;
  let sampleProduct2: any;

  beforeAll(async () => {
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
    await prisma.product.deleteMany();

    sampleProduct1 = await prisma.product.create({
      data: {
        name: 'Canva Pro Lifetime',
        slug: 'canva-pro-lifetime',
        category: 'Design & Creative',
        description: 'Akun Canva Pro Lifetime invite team',
        variants: JSON.stringify([{ name: 'Lifetime', price: 45000 }]),
        usp: JSON.stringify(['Aktivasi Instan', 'Garansi Selamanya']),
        isActive: true,
      },
    });

    sampleProduct2 = await prisma.product.create({
      data: {
        name: 'ChatGPT Plus Shared',
        slug: 'chatgpt-plus-shared',
        category: 'AI & Productivity',
        description: 'Akun ChatGPT Plus GPT-4o access',
        variants: JSON.stringify([{ name: '1 Bulan', price: 50000 }]),
        usp: JSON.stringify(['Fitur Lengkap GPT-4o', 'Hemat 80%']),
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
    await prisma.product.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
  });

  describe('GET /api/drafts', () => {
    it('returns empty array when no drafts exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/drafts');
      const res = await getDrafts(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.drafts).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('returns all drafts with nested posts ordered by orderIndex and linked product', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: '5 Tips Desain Cepat di Canva',
          type: 'THREAD_CHAIN',
          status: 'PENDING_REVIEW',
          source: 'HERMES_AI',
          hookAngle: 'Tips & Tricks',
          productId: sampleProduct1.id,
          posts: {
            create: [
              { orderIndex: 0, content: 'Part 1: Shortcut rahasia' },
              { orderIndex: 1, content: 'Part 2: Color palette palette hack' },
              { orderIndex: 2, content: 'Part 3: Link bio untuk Canva Pro' },
            ],
          },
        },
      });

      const req = new NextRequest('http://localhost:3000/api/drafts');
      const res = await getDrafts(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(1);
      expect(body.data[0].id).toBe(draft.id);
      expect(body.data[0].product.name).toBe('Canva Pro Lifetime');
      expect(body.data[0].posts.length).toBe(3);
      expect(body.data[0].posts[0].orderIndex).toBe(0);
      expect(body.data[0].posts[1].orderIndex).toBe(1);
      expect(body.data[0].posts[2].orderIndex).toBe(2);
    });

    it('filters drafts by status (e.g. ?status=APPROVED, ?status=PENDING_REVIEW)', async () => {
      await prisma.contentDraft.create({
        data: {
          title: 'Draft 1 Pending',
          status: 'PENDING_REVIEW',
          posts: { create: [{ orderIndex: 0, content: 'Content 1' }] },
        },
      });
      await prisma.contentDraft.create({
        data: {
          title: 'Draft 2 Approved',
          status: 'APPROVED',
          posts: { create: [{ orderIndex: 0, content: 'Content 2' }] },
        },
      });
      await prisma.contentDraft.create({
        data: {
          title: 'Draft 3 Published',
          status: 'PUBLISHED',
          posts: { create: [{ orderIndex: 0, content: 'Content 3' }] },
        },
      });

      const pendingReq = new NextRequest('http://localhost:3000/api/drafts?status=PENDING_REVIEW');
      const pendingRes = await getDrafts(pendingReq);
      const pendingBody = await pendingRes.json();
      expect(pendingBody.count).toBe(1);
      expect(pendingBody.data[0].status).toBe('PENDING_REVIEW');
      expect(pendingBody.data[0].title).toBe('Draft 1 Pending');

      const approvedReq = new NextRequest('http://localhost:3000/api/drafts?status=APPROVED');
      const approvedRes = await getDrafts(approvedReq);
      const approvedBody = await approvedRes.json();
      expect(approvedBody.count).toBe(1);
      expect(approvedBody.data[0].status).toBe('APPROVED');
      expect(approvedBody.data[0].title).toBe('Draft 2 Approved');
    });

    it('filters drafts by productId', async () => {
      await prisma.contentDraft.create({
        data: {
          title: 'Canva Post',
          productId: sampleProduct1.id,
          posts: { create: [{ orderIndex: 0, content: 'Canva Content' }] },
        },
      });
      await prisma.contentDraft.create({
        data: {
          title: 'ChatGPT Post',
          productId: sampleProduct2.id,
          posts: { create: [{ orderIndex: 0, content: 'ChatGPT Content' }] },
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts?productId=${sampleProduct1.id}`);
      const res = await getDrafts(req);
      const body = await res.json();
      expect(body.count).toBe(1);
      expect(body.data[0].productId).toBe(sampleProduct1.id);
      expect(body.data[0].title).toBe('Canva Post');
    });

    it('filters drafts by search query across title, hookAngle, or post content', async () => {
      await prisma.contentDraft.create({
        data: {
          title: 'Hemat Biaya Langganan Software',
          hookAngle: 'Price Comparison',
          posts: { create: [{ orderIndex: 0, content: 'Bandingkan harga bulanan vs tahunan' }] },
        },
      });
      await prisma.contentDraft.create({
        data: {
          title: 'Rahasia Prompting Produktif',
          hookAngle: 'Productivity Hacks',
          posts: { create: [{ orderIndex: 0, content: 'Cara bikin outline artikel dalam 2 menit' }] },
        },
      });

      // Search by title
      const searchTitleReq = new NextRequest('http://localhost:3000/api/drafts?search=Hemat');
      const searchTitleRes = await getDrafts(searchTitleReq);
      const searchTitleBody = await searchTitleRes.json();
      expect(searchTitleBody.count).toBe(1);
      expect(searchTitleBody.data[0].title).toBe('Hemat Biaya Langganan Software');

      // Search by hookAngle
      const searchHookReq = new NextRequest('http://localhost:3000/api/drafts?search=Productivity');
      const searchHookRes = await getDrafts(searchHookReq);
      const searchHookBody = await searchHookRes.json();
      expect(searchHookBody.count).toBe(1);
      expect(searchHookBody.data[0].title).toBe('Rahasia Prompting Produktif');

      // Search by post content
      const searchContentReq = new NextRequest('http://localhost:3000/api/drafts?search=outline');
      const searchContentRes = await getDrafts(searchContentReq);
      const searchContentBody = await searchContentRes.json();
      expect(searchContentBody.count).toBe(1);
      expect(searchContentBody.data[0].title).toBe('Rahasia Prompting Produktif');
    });
  });

  describe('POST /api/drafts', () => {
    it('creates a manual single draft successfully', async () => {
      const payload = {
        title: 'Panduan Praktis Desain Pemula',
        productId: sampleProduct1.id,
        hookAngle: 'Beginner Guide',
        posts: [
          {
            orderIndex: 0,
            content: 'Ini adalah panduan praktis untuk pemula yang ingin belajar desain.',
            mediaUrl: 'https://example.com/image1.jpg',
          },
        ],
      };

      const req = new NextRequest('http://localhost:3000/api/drafts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await createDraft(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe(payload.title);
      expect(body.data.type).toBe('SINGLE');
      expect(body.data.source).toBe('MANUAL');
      expect(body.data.status).toBe('PENDING_REVIEW');
      expect(body.data.posts.length).toBe(1);
      expect(body.data.posts[0].content).toBe(payload.posts[0].content);
      expect(body.data.posts[0].mediaUrl).toBe(payload.posts[0].mediaUrl);
      expect(body.data.product.id).toBe(sampleProduct1.id);
    });

    it('creates a manual multi-post thread draft and sets type to THREAD_CHAIN', async () => {
      const payload = {
        title: '3 Alasan Pakai AI untuk Kerja',
        type: 'THREAD_CHAIN',
        hookAngle: 'Listicle',
        productId: sampleProduct2.id,
        posts: [
          { content: 'Post 1: Hemat waktu hingga 5 jam seminggu.' },
          { content: 'Post 2: Ide konten tidak pernah habis.' },
          { content: 'Post 3: Link pembelian akun di bio!' },
        ],
      };

      const req = new NextRequest('http://localhost:3000/api/drafts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await createDraft(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.type).toBe('THREAD_CHAIN');
      expect(body.data.posts.length).toBe(3);
      expect(body.data.posts[0].orderIndex).toBe(0);
      expect(body.data.posts[1].orderIndex).toBe(1);
      expect(body.data.posts[2].orderIndex).toBe(2);
    });

    it('validates required draft fields (title, non-empty posts)', async () => {
      // Missing title
      const reqNoTitle = new NextRequest('http://localhost:3000/api/drafts', {
        method: 'POST',
        body: JSON.stringify({ posts: [{ content: 'Test' }] }),
      });
      const resNoTitle = await createDraft(reqNoTitle);
      expect(resNoTitle.status).toBe(400);
      const bodyNoTitle = await resNoTitle.json();
      expect(bodyNoTitle.success).toBe(false);
      expect(bodyNoTitle.error).toContain('title');

      // Empty posts
      const reqNoPosts = new NextRequest('http://localhost:3000/api/drafts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Title', posts: [] }),
      });
      const resNoPosts = await createDraft(reqNoPosts);
      expect(resNoPosts.status).toBe(400);
      const bodyNoPosts = await resNoPosts.json();
      expect(bodyNoPosts.success).toBe(false);
      expect(bodyNoPosts.error).toContain('posts');
    });
  });

  describe('GET /api/drafts/[id]', () => {
    it('returns a single draft with posts and product details', async () => {
      const created = await prisma.contentDraft.create({
        data: {
          title: 'Single Draft Query Test',
          productId: sampleProduct1.id,
          posts: {
            create: [{ orderIndex: 0, content: 'Single content preview' }],
          },
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${created.id}`);
      const res = await getDraftById(req, { params: { id: created.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(created.id);
      expect(body.data.product.name).toBe('Canva Pro Lifetime');
      expect(body.data.posts.length).toBe(1);
    });

    it('returns 404 for non-existent draft ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/drafts/non-existent-id');
      const res = await getDraftById(req, { params: { id: 'non-existent-id' } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  describe('PUT /api/drafts/[id]', () => {
    it('updates draft metadata and replaces post items', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Original Title',
          hookAngle: 'Old Hook',
          productId: sampleProduct1.id,
          posts: {
            create: [
              { orderIndex: 0, content: 'Old Post 1' },
              { orderIndex: 1, content: 'Old Post 2' },
            ],
          },
        },
      });

      const updatePayload = {
        title: 'Updated Title Draft',
        hookAngle: 'New Hook Angle',
        productId: sampleProduct2.id,
        type: 'SINGLE',
        status: 'APPROVED',
        posts: [
          { orderIndex: 0, content: 'Brand New Post Content', mediaUrl: 'https://example.com/new.png' },
        ],
      };

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      });

      const res = await updateDraft(req, { params: { id: draft.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Updated Title Draft');
      expect(body.data.hookAngle).toBe('New Hook Angle');
      expect(body.data.productId).toBe(sampleProduct2.id);
      expect(body.data.status).toBe('APPROVED');
      expect(body.data.type).toBe('SINGLE');
      expect(body.data.posts.length).toBe(1);
      expect(body.data.posts[0].content).toBe('Brand New Post Content');
      expect(body.data.posts[0].mediaUrl).toBe('https://example.com/new.png');
    });

    it('returns 404 when updating a non-existent draft', async () => {
      const req = new NextRequest('http://localhost:3000/api/drafts/invalid-id', {
        method: 'PUT',
        body: JSON.stringify({ title: 'New' }),
      });

      const res = await updateDraft(req, { params: { id: 'invalid-id' } });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  describe('PATCH /api/drafts/[id]', () => {
    it('supports fast status update (e.g. approving a draft)', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft to Approve',
          status: 'PENDING_REVIEW',
          posts: { create: [{ orderIndex: 0, content: 'Content' }] },
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const res = await patchDraft(req, { params: { id: draft.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('APPROVED');

      // Verify in DB
      const inDb = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
      expect(inDb?.status).toBe('APPROVED');
    });

    it('supports full/partial content and posts update via PATCH', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Old Title',
          status: 'PENDING_REVIEW',
          posts: { create: [{ orderIndex: 0, content: 'Old Post' }] },
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title via PATCH',
          hookAngle: 'New Hook Angle',
          posts: [
            { orderIndex: 0, content: 'New Post 1' },
            { orderIndex: 1, content: 'New Post 2' },
          ],
        }),
      });

      const res = await patchDraft(req, { params: { id: draft.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Updated Title via PATCH');
      expect(body.data.posts.length).toBe(2);
      expect(body.data.posts[0].content).toBe('New Post 1');
      expect(body.data.type).toBe('THREAD_CHAIN');
    });

    it('updates status to PUBLISHED with threadPostUrl and publishedAt', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft to Publish',
          status: 'APPROVED',
          posts: { create: [{ orderIndex: 0, content: 'Content' }] },
        },
      });

      const publishedTime = new Date().toISOString();
      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'PUBLISHED',
          threadPostId: 'threads_123456789',
          threadPostUrl: 'https://threads.net/@user/post/123456789',
          publishedAt: publishedTime,
        }),
      });

      const res = await patchDraft(req, { params: { id: draft.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PUBLISHED');
      expect(body.data.threadPostId).toBe('threads_123456789');
      expect(body.data.threadPostUrl).toBe('https://threads.net/@user/post/123456789');
    });

    it('updates status to FAILED with errorMessage', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft with Error',
          status: 'APPROVED',
          posts: { create: [{ orderIndex: 0, content: 'Content' }] },
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'FAILED',
          errorMessage: 'Threads API token expired',
        }),
      });

      const res = await patchDraft(req, { params: { id: draft.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('FAILED');
      expect(body.data.errorMessage).toBe('Threads API token expired');
    });

    it('rejects invalid status values with 400', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft with Invalid Status',
          status: 'PENDING_REVIEW',
          posts: { create: [{ orderIndex: 0, content: 'Content' }] },
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'INVALID_STATUS_XYZ' }),
      });

      const res = await patchDraft(req, { params: { id: draft.id } });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('status');
    });

    it('returns 404 for non-existent draft ID on PATCH', async () => {
      const req = new NextRequest('http://localhost:3000/api/drafts/missing-id', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const res = await patchDraft(req, { params: { id: 'missing-id' } });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/drafts/[id]', () => {
    it('deletes draft and cascades deletion to nested posts', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft to delete',
          posts: {
            create: [
              { orderIndex: 0, content: 'Delete me 1' },
              { orderIndex: 1, content: 'Delete me 2' },
            ],
          },
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`);
      const res = await deleteDraft(req, { params: { id: draft.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.id).toBe(draft.id);

      // Verify draft is deleted
      const inDbDraft = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
      expect(inDbDraft).toBeNull();

      // Verify cascaded post items are deleted
      const inDbPosts = await prisma.draftPostItem.findMany({ where: { draftId: draft.id } });
      expect(inDbPosts.length).toBe(0);
    });

    it('returns 404 when deleting a non-existent draft', async () => {
      const req = new NextRequest('http://localhost:3000/api/drafts/not-found-id');
      const res = await deleteDraft(req, { params: { id: 'not-found-id' } });
      expect(res.status).toBe(404);
    });
  });

  describe('/api/drafts/[id]/status', () => {
    it('GET returns current status and info of draft', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Status Check Draft',
          status: 'PENDING_REVIEW',
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}/status`);
      const res = await getDraftStatus(req, { params: { id: draft.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.id).toBe(draft.id);
      expect(body.status).toBe('PENDING_REVIEW');
    });

    it('GET returns 404 for non-existent draft', async () => {
      const req = new NextRequest('http://localhost:3000/api/drafts/nonexistent-id/status');
      const res = await getDraftStatus(req, { params: { id: 'nonexistent-id' } });
      expect(res.status).toBe(404);
    });

    it('PATCH updates draft status to APPROVED', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft to approve',
          status: 'PENDING_REVIEW',
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const res = await patchDraftStatus(req, { params: { id: draft.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.draft.status).toBe('APPROVED');

      const inDb = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
      expect(inDb?.status).toBe('APPROVED');
    });

    it('PATCH returns 400 for invalid status', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft invalid status',
          status: 'PENDING_REVIEW',
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS_XYZ' }),
      });

      const res = await patchDraftStatus(req, { params: { id: draft.id } });
      expect(res.status).toBe(400);
    });

    it('PATCH returns 404 for non-existent draft', async () => {
      const req = new NextRequest('http://localhost:3000/api/drafts/missing-id/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const res = await patchDraftStatus(req, { params: { id: 'missing-id' } });
      expect(res.status).toBe(404);
    });
  });
});
