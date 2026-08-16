import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getOverview } from '../src/app/api/overview/route';
import { GET as getProducts, POST as createProduct } from '../src/app/api/products/route';
import { GET as getDrafts } from '../src/app/api/drafts/route';
import { GET as getDraftById, PUT as updateDraft, PATCH as patchDraft, DELETE as deleteDraft } from '../src/app/api/drafts/[id]/route';
import { GET as getHermesActiveProducts } from '../src/app/api/hermes/products/active/route';
import { POST as createHermesDraft } from '../src/app/api/hermes/drafts/route';
import { GET as getHermesApprovedDrafts } from '../src/app/api/hermes/drafts/approved/route';
import { PATCH as updateHermesDraftStatus } from '../src/app/api/hermes/drafts/[id]/status/route';
import { GET as getSettings, PUT as updateSettings, POST as handleSettingsAction } from '../src/app/api/settings/route';

describe('End-to-End Marketing Pipeline Integration Test Suite', () => {
  const HERMES_API_KEY = 'hermes-e2e-super-key-2026';

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

  describe('Full Lifecycle: Product Ingestion -> Hermes AI Copywriting -> Human Review & Approval -> Threads Auto-Post -> Overview Metrics', () => {
    let createdProductId: string;
    let generatedDraftId: string;

    beforeEach(async () => {
      await prisma.draftPostItem.deleteMany();
      await prisma.contentDraft.deleteMany();
      await prisma.product.deleteMany();
      await prisma.systemConfig.deleteMany();

      // Configure initial Hermes API Key
      await prisma.systemConfig.create({
        data: {
          key: 'HERMES_API_KEY',
          value: HERMES_API_KEY,
          description: 'E2E Hermes Secret Key',
        },
      });
    });

    it('successfully executes the entire end-to-end marketing automation workflow', async () => {
      // -------------------------------------------------------------
      // Phase 1: Store Owner creates a new digital product catalog entry
      // -------------------------------------------------------------
      const productPayload = {
        name: 'Canva Pro 1 Tahun Akun Pribadi',
        slug: 'canva-pro-1-tahun',
        category: 'Design Tools',
        description: 'Upgrade akun pribadi Canva menjadi Canva Pro selama 1 tahun penuh tanpa resiko reset.',
        variants: [
          { name: '1 Tahun Akun Pribadi', price: 45000, duration: '365 hari' },
          { name: 'Lifetime Edu', price: 25000, duration: 'permanen' },
        ],
        usp: [
          'Full Garansi 365 Hari Replace Akun',
          'Invite Legal via Email Sendiri',
          'Akses Brand Kit & Jutaan Template Premium',
        ],
        targetAudience: 'Content creator, mahasiswa desain, pemilik olshop',
        toneOfVoice: 'Solutif, antusias, & persuasif',
        ctaTemplate: 'Komentar "CANVA" atau klik link di bio untuk klaim harga promo 45rb!',
        isActive: true,
      };

      const createProductReq = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(productPayload),
      });

      const createProductRes = await createProduct(createProductReq);
      expect(createProductRes.status).toBe(201);
      const createProductJson = await createProductRes.json();
      expect(createProductJson.success).toBe(true);
      expect(createProductJson.data.name).toBe('Canva Pro 1 Tahun Akun Pribadi');
      expect(createProductJson.data.variants).toHaveLength(2);
      expect(createProductJson.data.usp).toHaveLength(3);
      createdProductId = createProductJson.data.id;

      // Verify product is listed in products query
      const listProductsReq = new NextRequest('http://localhost:3000/api/products?category=Design%20Tools');
      const listProductsRes = await getProducts(listProductsReq);
      expect(listProductsRes.status).toBe(200);
      const listProductsJson = await listProductsRes.json();
      expect(listProductsJson.count).toBe(1);
      expect(listProductsJson.products[0].id).toBe(createdProductId);

      // -------------------------------------------------------------
      // Phase 2: Hermes Agent queries active products with authentication
      // -------------------------------------------------------------
      const hermesProductsReq = new NextRequest('http://localhost:3000/api/hermes/products/active', {
        headers: {
          authorization: `Bearer ${HERMES_API_KEY}`,
        },
      });

      const hermesProductsRes = await getHermesActiveProducts(hermesProductsReq);
      expect(hermesProductsRes.status).toBe(200);
      const hermesProductsJson = await hermesProductsRes.json();
      expect(hermesProductsJson.success).toBe(true);
      expect(hermesProductsJson.count).toBe(1);
      expect(hermesProductsJson.products[0].id).toBe(createdProductId);
      expect(hermesProductsJson.products[0].variants[0].price).toBe(45000);

      // -------------------------------------------------------------
      // Phase 3: Hermes AI generates copywriting thread chain & submits draft
      // -------------------------------------------------------------
      const draftPayload = {
        title: 'Rahasia Desain Banner Kece Modal 45rb/Tahun ✨',
        productId: createdProductId,
        type: 'THREAD_CHAIN',
        hookAngle: 'Cost Comparison & Productivity Hack',
        posts: [
          {
            orderIndex: 0,
            content: 'Masih bayar Canva Pro ratusan ribu per bulan atau ribet cari template watermark free? 🧵👇',
          },
          {
            orderIndex: 1,
            content: 'Nih solusinya: upgrade akun Canva pribadi kamu cuma 45rb buat 1 tahun penuh legal invite!\n\nFitur lengkap:\n- Brand Kit unlock\n- Magic Studio AI\n- Jutaan aset premium tanpa batas',
          },
          {
            orderIndex: 2,
            content: 'Garansi 365 hari penuh. Ga perlu ganti email atau hilang file desain kamu.\n\n👉 Komentar "CANVA" sekarang atau klik link di bio untuk order instan via WhatsApp!',
          },
        ],
        metadata: {
          generatedBy: 'Hermes-Agent-v2',
          promptTokens: 420,
          completionTokens: 280,
          framework: 'Problem-Agitation-Solution',
        },
      };

      const hermesDraftReq = new NextRequest('http://localhost:3000/api/hermes/drafts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${HERMES_API_KEY}`,
        },
        body: JSON.stringify(draftPayload),
      });

      const hermesDraftRes = await createHermesDraft(hermesDraftReq);
      expect(hermesDraftRes.status).toBe(201);
      const hermesDraftJson = await hermesDraftRes.json();
      expect(hermesDraftJson.success).toBe(true);
      expect(hermesDraftJson.draft.status).toBe('PENDING_REVIEW');
      expect(hermesDraftJson.draft.source).toBe('HERMES_AI');
      expect(hermesDraftJson.draft.posts).toHaveLength(3);
      generatedDraftId = hermesDraftJson.draft.id;

      // -------------------------------------------------------------
      // Phase 4: Store Owner reviews dashboard overview & sees pending review count
      // -------------------------------------------------------------
      const overviewReq1 = new NextRequest('http://localhost:3000/api/overview');
      const overviewRes1 = await getOverview(overviewReq1);
      expect(overviewRes1.status).toBe(200);
      const overviewJson1 = await overviewRes1.json();
      const overviewData1 = overviewJson1.data || overviewJson1;
      expect(overviewData1.counts.totalProducts).toBe(1);
      expect(overviewData1.counts.activeProducts).toBe(1);
      expect(overviewData1.counts.pendingDrafts).toBe(1);
      expect(overviewData1.counts.approvedDrafts).toBe(0);
      expect(overviewData1.counts.publishedDrafts).toBe(0);
      expect(overviewData1.recentPendingDrafts).toHaveLength(1);
      expect(overviewData1.recentPendingDrafts[0].id).toBe(generatedDraftId);

      // -------------------------------------------------------------
      // Phase 5: Store Owner inspects draft, refines content, and approves it
      // -------------------------------------------------------------
      const getDraftReq = new NextRequest(`http://localhost:3000/api/drafts/${generatedDraftId}`);
      const getDraftRes = await getDraftById(getDraftReq, { params: { id: generatedDraftId } });
      expect(getDraftRes.status).toBe(200);
      const getDraftJson = await getDraftRes.json();
      expect(getDraftJson.draft.posts).toHaveLength(3);

      // Owner edits post 0 to make it punchier
      const editDraftReq = new NextRequest(`http://localhost:3000/api/drafts/${generatedDraftId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'Rahasia Desain Banner Kece Modal 45rb/Tahun [APPROVED]',
          posts: [
            {
              orderIndex: 0,
              content: 'Masih bayar Canva Pro ratusan ribu sebulan? Simak trik hemat legal ini 🧵👇',
            },
            {
              orderIndex: 1,
              content: getDraftJson.draft.posts[1].content,
            },
            {
              orderIndex: 2,
              content: getDraftJson.draft.posts[2].content,
            },
          ],
        }),
      });
      const editDraftRes = await updateDraft(editDraftReq, { params: { id: generatedDraftId } });
      expect(editDraftRes.status).toBe(200);
      const editDraftJson = await editDraftRes.json();
      expect(editDraftJson.draft.title).toContain('[APPROVED]');
      expect(editDraftJson.draft.posts[0].content).toContain('Simak trik hemat legal ini');

      // Owner approves the draft
      const approveReq = new NextRequest(`http://localhost:3000/api/drafts/${generatedDraftId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const approveRes = await patchDraft(approveReq, { params: { id: generatedDraftId } });
      expect(approveRes.status).toBe(200);
      const approveJson = await approveRes.json();
      expect(approveJson.draft.status).toBe('APPROVED');

      // -------------------------------------------------------------
      // Phase 6: Hermes Agent queries approved queue & finds the ready draft
      // -------------------------------------------------------------
      const hermesApprovedReq = new NextRequest('http://localhost:3000/api/hermes/drafts/approved', {
        headers: {
          authorization: `Bearer ${HERMES_API_KEY}`,
        },
      });
      const hermesApprovedRes = await getHermesApprovedDrafts(hermesApprovedReq);
      expect(hermesApprovedRes.status).toBe(200);
      const hermesApprovedJson = await hermesApprovedRes.json();
      expect(hermesApprovedJson.success).toBe(true);
      expect(hermesApprovedJson.count).toBe(1);
      expect(hermesApprovedJson.drafts[0].id).toBe(generatedDraftId);
      expect(hermesApprovedJson.drafts[0].posts).toHaveLength(3);

      // -------------------------------------------------------------
      // Phase 7: Hermes Agent posts to Threads and reports status back
      // -------------------------------------------------------------
      const publishPayload = {
        status: 'PUBLISHED',
        threadPostId: 'threads_canva_post_888999',
        threadPostUrl: 'https://threads.net/@tokodigital.id/post/canva_888999',
        publishedAt: new Date().toISOString(),
      };

      const hermesPublishReq = new NextRequest(`http://localhost:3000/api/hermes/drafts/${generatedDraftId}/status`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${HERMES_API_KEY}`,
        },
        body: JSON.stringify(publishPayload),
      });

      const hermesPublishRes = await updateHermesDraftStatus(hermesPublishReq, {
        params: { id: generatedDraftId },
      });
      expect(hermesPublishRes.status).toBe(200);
      const hermesPublishJson = await hermesPublishRes.json();
      expect(hermesPublishJson.success).toBe(true);
      expect(hermesPublishJson.draft.status).toBe('PUBLISHED');
      expect(hermesPublishJson.draft.threadPostId).toBe('threads_canva_post_888999');
      expect(hermesPublishJson.draft.threadPostUrl).toBe('https://threads.net/@tokodigital.id/post/canva_888999');

      // -------------------------------------------------------------
      // Phase 8: Final Overview verification
      // -------------------------------------------------------------
      const overviewReq2 = new NextRequest('http://localhost:3000/api/overview');
      const overviewRes2 = await getOverview(overviewReq2);
      expect(overviewRes2.status).toBe(200);
      const overviewJson2 = await overviewRes2.json();
      const overviewData2 = overviewJson2.data || overviewJson2;

      expect(overviewData2.counts.pendingDrafts).toBe(0);
      expect(overviewData2.counts.approvedDrafts).toBe(0);
      expect(overviewData2.counts.publishedDrafts).toBe(1);
      expect(overviewData2.recentPendingDrafts).toHaveLength(0);
      expect(overviewData2.recentPublishedDrafts).toHaveLength(1);
      expect(overviewData2.recentPublishedDrafts[0].id).toBe(generatedDraftId);
      expect(overviewData2.recentPublishedDrafts[0].threadPostUrl).toBe('https://threads.net/@tokodigital.id/post/canva_888999');
    });
  });

  describe('Edge Cases & Alternative Workflows', () => {
    let testProductId: string;

    beforeEach(async () => {
      await prisma.draftPostItem.deleteMany();
      await prisma.contentDraft.deleteMany();
      await prisma.product.deleteMany();
      await prisma.systemConfig.deleteMany();

      await prisma.systemConfig.create({
        data: {
          key: 'HERMES_API_KEY',
          value: HERMES_API_KEY,
        },
      });

      const prod = await prisma.product.create({
        data: {
          name: 'Spotify Family Head',
          slug: 'spotify-family-head',
          category: 'Streaming Music',
          variants: JSON.stringify([{ name: '1 Bulan', price: 20000 }]),
          usp: JSON.stringify(['Akun Baru / Lama']),
          isActive: true,
        },
      });
      testProductId = prod.id;
    });

    it('handles human rejection by deleting unwanted draft (DELETE /api/drafts/[id]) and validates invalid status rejection', async () => {
      // 1. Create draft via Hermes
      const createDraftReq = new NextRequest('http://localhost:3000/api/hermes/drafts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${HERMES_API_KEY}`,
        },
        body: JSON.stringify({
          title: 'Draft to be rejected',
          productId: testProductId,
          posts: [{ orderIndex: 0, content: 'Spammy text hook' }],
        }),
      });
      const createDraftRes = await createHermesDraft(createDraftReq);
      const { draft } = await createDraftRes.json();

      // 2. Attempting to set an invalid status fails with 400
      const invalidStatusReq = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'INVALID_STATUS_NAME' }),
      });
      const invalidStatusRes = await patchDraft(invalidStatusReq, { params: { id: draft.id } });
      expect(invalidStatusRes.status).toBe(400);

      // 3. Owner rejects by deleting draft
      const deleteReq = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`);
      const deleteRes = await deleteDraft(deleteReq, { params: { id: draft.id } });
      expect(deleteRes.status).toBe(200);

      // 4. Verify it does not appear in Hermes approved queue
      const approvedReq = new NextRequest('http://localhost:3000/api/hermes/drafts/approved', {
        headers: { authorization: `Bearer ${HERMES_API_KEY}` },
      });
      const approvedRes = await getHermesApprovedDrafts(approvedReq);
      const approvedJson = await approvedRes.json();
      expect(approvedJson.drafts).toHaveLength(0);

      // 5. Verify draft no longer exists
      const getDeletedReq = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`);
      const getDeletedRes = await getDraftById(getDeletedReq, { params: { id: draft.id } });
      expect(getDeletedRes.status).toBe(404);
    });

    it('handles Hermes posting failure report (status: FAILED with errorMessage)', async () => {
      // 1. Create draft directly as APPROVED
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft experiencing API failure',
          productId: testProductId,
          status: 'APPROVED',
          posts: {
            create: [{ orderIndex: 0, content: 'Some good content' }],
          },
        },
      });

      // 2. Hermes reports failure
      const failPayload = {
        status: 'FAILED',
        errorMessage: 'Rate limit 429: Threads API daily quota exceeded',
      };
      const failReq = new NextRequest(`http://localhost:3000/api/hermes/drafts/${draft.id}/status`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${HERMES_API_KEY}`,
        },
        body: JSON.stringify(failPayload),
      });
      const failRes = await updateHermesDraftStatus(failReq, { params: { id: draft.id } });
      expect(failRes.status).toBe(200);
      const failJson = await failRes.json();
      expect(failJson.draft.status).toBe('FAILED');
      expect(failJson.draft.errorMessage).toContain('Threads API daily quota exceeded');

      // 3. Overview counters show failedDrafts: 1
      const overviewRes = await getOverview(new NextRequest('http://localhost:3000/api/overview'));
      const overviewJson = await overviewRes.json();
      const data = overviewJson.data || overviewJson;
      expect(data.counts.failedDrafts).toBe(1);
    });

    it('enforces authentication and responds with 401 for missing/invalid keys', async () => {
      // Missing auth
      const noAuthReq = new NextRequest('http://localhost:3000/api/hermes/products/active');
      const noAuthRes = await getHermesActiveProducts(noAuthReq);
      expect(noAuthRes.status).toBe(401);

      // Wrong auth
      const wrongAuthReq = new NextRequest('http://localhost:3000/api/hermes/products/active', {
        headers: { authorization: 'Bearer invalid-token-1234' },
      });
      const wrongAuthRes = await getHermesActiveProducts(wrongAuthReq);
      expect(wrongAuthRes.status).toBe(401);
    });

    it('updates system Hermes API Key via Settings API and reflects immediately on auth', async () => {
      const NEW_SECRET_KEY = 'hermes_new_rotated_key_9999';

      // 1. Update settings
      const updateSettingsReq = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          settings: {
            HERMES_API_KEY: NEW_SECRET_KEY,
            STORE_NAME: 'Updated Threads Store',
          },
        }),
      });
      const updateRes = await updateSettings(updateSettingsReq);
      expect(updateRes.status).toBe(200);

      // 2. Old key should now fail
      const oldKeyReq = new NextRequest('http://localhost:3000/api/hermes/products/active', {
        headers: { authorization: `Bearer ${HERMES_API_KEY}` },
      });
      const oldKeyRes = await getHermesActiveProducts(oldKeyReq);
      expect(oldKeyRes.status).toBe(401);

      // 3. New key should succeed
      const newKeyReq = new NextRequest('http://localhost:3000/api/hermes/products/active', {
        headers: { authorization: `Bearer ${NEW_SECRET_KEY}` },
      });
      const newKeyRes = await getHermesActiveProducts(newKeyReq);
      expect(newKeyRes.status).toBe(200);
    });

    it('cascades deletion properly when draft or product is deleted', async () => {
      // Create product and draft with posts
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Cascade test draft',
          productId: testProductId,
          status: 'PENDING_REVIEW',
          posts: {
            create: [
              { orderIndex: 0, content: 'Post 1' },
              { orderIndex: 1, content: 'Post 2' },
            ],
          },
        },
      });

      // Verify posts in DB
      let postsInDb = await prisma.draftPostItem.findMany({ where: { draftId: draft.id } });
      expect(postsInDb).toHaveLength(2);

      // Delete draft via API
      const delDraftReq = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}`);
      const delDraftRes = await deleteDraft(delDraftReq, { params: { id: draft.id } });
      expect(delDraftRes.status).toBe(200);

      // Verify cascading delete of posts
      postsInDb = await prisma.draftPostItem.findMany({ where: { draftId: draft.id } });
      expect(postsInDb).toHaveLength(0);
    });
  });
});
