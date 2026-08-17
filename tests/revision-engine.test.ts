import { describe, it, expect } from 'vitest';
import { reviseDraftContent, detectTargetPostIndex } from '../src/lib/revision-engine';

describe('AI Revision Engine (ecommerce-copy-humanizer-id)', () => {
  const mockProduct = {
    id: 'prod-1',
    name: 'Youtube Premium',
    category: 'Streaming Video',
    description: 'Youtube Premium Sharing Via Invite',
    variants: [
      { name: '1 Bulan', price: 5000, duration: '1 Bulan' },
      { name: '3 Bulan', price: 15000, duration: '3 Bulan' },
    ],
    usp: ['Full Garansi', 'Aktivasi Instan', 'Support 24/7'],
    targetAudience: 'Mahasiswa, Pekerja',
    toneOfVoice: 'Storytelling & Relate',
    ctaTemplate: 'Stok terbatas, langsung DM aja gess',
  };

  const initialPosts = [
    {
      orderIndex: 0,
      content: 'Lagi asik dengerin lagu tiba-tiba ada iklan? 😤\n\nNih cara nonton bebas iklan cuma 5rb! 🧵👇',
    },
    {
      orderIndex: 1,
      content: 'Keunggulan Toko Digital ID:\n✅ Full Garansi\n✅ Aktivasi Instan\n\n1 Bulan cuma Rp 5.000 aja!',
    },
    {
      orderIndex: 2,
      content: 'Klik link di bio untuk order sekarang sebelum promo habis!',
    },
  ];

  it('detects targeted post index from natural language instructions', () => {
    expect(detectTargetPostIndex('ubah post 3 menjadi ajak DM langsung')).toBe(2);
    expect(detectTargetPostIndex('ganti bagian 1 jadi lebih santai')).toBe(0);
    expect(detectTargetPostIndex('revisi hook post pertama')).toBe(0);
    expect(detectTargetPostIndex('revisi CTA terakhir')).toBe(2);
    expect(detectTargetPostIndex('bikin seluruh thread lebih santai')).toBe(null);
  });

  it('successfully revises a specific post when targeted instruction is provided', async () => {
    const result = await reviseDraftContent({
      posts: initialPosts,
      product: mockProduct,
      instruction: 'ubah post 3 menjadi stok terbatas langsung DM aja gess',
    });

    expect(result.posts.length).toBe(3);
    expect(result.posts[2].content).toContain('DM');
    expect(result.posts[2].content.length).toBeLessThan(500);
  }, 60000);

  it('revises whole thread tone when general instruction is provided', async () => {
    const result = await reviseDraftContent({
      posts: initialPosts,
      product: mockProduct,
      instruction: 'bikin gaya FOMO promo terbatas',
    });

    expect(result.posts.length).toBeGreaterThanOrEqual(2);
    expect(result.posts[0].content.length).toBeLessThan(500);
    expect(result.posts.some((p) => p.content.toLowerCase().includes('promo') || p.content.toLowerCase().includes('slot') || p.content.toLowerCase().includes('terbatas') || p.content.toLowerCase().includes('fomo'))).toBe(true);
  }, 60000);
});

import { POST as reviseDraftApi } from '../src/app/api/drafts/[id]/revise/route';
import { prisma } from '../src/lib/prisma';
import { NextRequest } from 'next/server';

describe('POST /api/drafts/[id]/revise API Route', () => {
  let createdDraftId: string;

  it('handles revision API request with autoSave', async () => {
    const draft = await prisma.contentDraft.create({
      data: {
        title: 'Test Draft for Revision API',
        type: 'THREAD_CHAIN',
        status: 'PENDING_REVIEW',
        posts: {
          create: [
            { orderIndex: 0, content: 'Post 1 Hook Awal' },
            { orderIndex: 1, content: 'Post 2 Benefit Utama' },
            { orderIndex: 2, content: 'Post 3 Link di bio' },
          ],
        },
      },
    });
    createdDraftId = draft.id;

    const req = new NextRequest(`http://localhost:3000/api/drafts/${draft.id}/revise`, {
      method: 'POST',
      body: JSON.stringify({
        instruction: 'ubah post 3 menjadi langsung DM admin untuk order ya',
        autoSave: true,
      }),
    });

    const res = await reviseDraftApi(req, { params: { id: draft.id } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.posts[2].content).toContain('DM');

    // Verify DB updated
    const updatedDbDraft = await prisma.contentDraft.findUnique({
      where: { id: draft.id },
      include: { posts: { orderBy: { orderIndex: 'asc' } } },
    });
    expect(updatedDbDraft?.posts[2].content).toContain('DM');

    // Cleanup
    await prisma.draftPostItem.deleteMany({ where: { draftId: draft.id } });
    await prisma.contentDraft.delete({ where: { id: draft.id } });
  });
});

