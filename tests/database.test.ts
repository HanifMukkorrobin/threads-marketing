import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';

describe('Prisma Database Schema & Client', () => {
  beforeAll(async () => {
    // Ensure clean state for test items
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
    await prisma.product.deleteMany();
    await prisma.systemConfig.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Product Model', () => {
    it('creates, queries, and updates a product with rich context and JSON fields', async () => {
      const variants = [
        { name: '1 Bulan', price: 25000, duration: '30 hari' },
        { name: '3 Bulan', price: 65000, duration: '90 hari' },
      ];
      const usp = ['Garansi 30 Hari', 'No VPN', 'Bisa Akun Pribadi'];

      const product = await prisma.product.create({
        data: {
          name: 'YouTube Premium Private',
          slug: 'youtube-premium-private',
          category: 'Streaming Video',
          description: 'Aktivasi langsung ke email pribadi tanpa perlu ganti akun',
          variants: JSON.stringify(variants),
          usp: JSON.stringify(usp),
          targetAudience: 'Pecinta musik & video tanpa iklan',
          toneOfVoice: 'Santai, solutif, FOMO',
          ctaTemplate: 'Klik link di bio untuk order instan!',
          isActive: true,
        },
      });

      expect(product.id).toBeDefined();
      expect(product.name).toBe('YouTube Premium Private');
      expect(product.slug).toBe('youtube-premium-private');
      expect(JSON.parse(product.variants)).toEqual(variants);
      expect(JSON.parse(product.usp)).toEqual(usp);
      expect(product.isActive).toBe(true);

      const found = await prisma.product.findUnique({
        where: { slug: 'youtube-premium-private' },
      });
      expect(found).not.toBeNull();
      expect(found?.category).toBe('Streaming Video');

      const updated = await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false },
      });
      expect(updated.isActive).toBe(false);
    });

    it('enforces unique slug constraint on product', async () => {
      await prisma.product.create({
        data: {
          name: 'Spotify Premium 1',
          slug: 'spotify-premium-unique',
          category: 'Music',
          variants: '[]',
          usp: '[]',
        },
      });

      await expect(
        prisma.product.create({
          data: {
            name: 'Spotify Premium 2',
            slug: 'spotify-premium-unique',
            category: 'Music',
            variants: '[]',
            usp: '[]',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('ContentDraft and DraftPostItem Models', () => {
    it('creates a draft with nested draft post items linked to a product', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Netflix Premium 4K',
          slug: 'netflix-premium-4k-draft-test',
          category: 'Streaming Video',
          variants: JSON.stringify([{ name: '1 Bulan 1 Profil', price: 35000 }]),
          usp: JSON.stringify(['4K UHD', 'Anti On-Hold']),
        },
      });

      const draft = await prisma.contentDraft.create({
        data: {
          productId: product.id,
          title: 'Tips Nonton Hemat Netflix 4K',
          type: 'THREAD_CHAIN',
          status: 'PENDING_REVIEW',
          hookAngle: 'FOMO & Save Money',
          source: 'HERMES_AI',
          metadata: JSON.stringify({ aiModel: 'hermes-3-llama-3.1-8b', promptTokens: 350 }),
          posts: {
            create: [
              {
                orderIndex: 0,
                content: 'Capek bayar Netflix 186rb per bulan sendirian? Ini trik nonton 4K legal cuma 35rb! 🧵👇',
              },
              {
                orderIndex: 1,
                content: 'Solusinya adalah akun sharing profil resmi. 1 akun 5 profil privat, masing-masing pakai PIN sendiri.',
              },
              {
                orderIndex: 2,
                content: 'Mau coba? Cek link di bio kami, garansi replace 30 hari penuh anti on-hold!',
              },
            ],
          },
        },
        include: {
          product: true,
          posts: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      expect(draft.id).toBeDefined();
      expect(draft.product?.name).toBe('Netflix Premium 4K');
      expect(draft.posts).toHaveLength(3);
      expect(draft.posts[0].orderIndex).toBe(0);
      expect(draft.posts[0].content).toContain('Capek bayar');
      expect(draft.posts[2].orderIndex).toBe(2);
      expect(draft.status).toBe('PENDING_REVIEW');
    });

    it('cascades delete from ContentDraft to DraftPostItems', async () => {
      const draft = await prisma.contentDraft.create({
        data: {
          title: 'Draft to delete',
          type: 'SINGLE',
          posts: {
            create: [
              { orderIndex: 0, content: 'Single post content' },
            ],
          },
        },
        include: { posts: true },
      });

      const postId = draft.posts[0].id;
      expect(postId).toBeDefined();

      await prisma.contentDraft.delete({
        where: { id: draft.id },
      });

      const foundPost = await prisma.draftPostItem.findUnique({
        where: { id: postId },
      });
      expect(foundPost).toBeNull();
    });

    it('sets productId to null on draft when product is deleted', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Temporary Product',
          slug: 'temp-product-delete-test',
          category: 'Test',
          variants: '[]',
          usp: '[]',
        },
      });

      const draft = await prisma.contentDraft.create({
        data: {
          productId: product.id,
          title: 'Draft with temporary product',
          type: 'SINGLE',
          posts: {
            create: [{ orderIndex: 0, content: 'Test post' }],
          },
        },
      });

      await prisma.product.delete({
        where: { id: product.id },
      });

      const updatedDraft = await prisma.contentDraft.findUnique({
        where: { id: draft.id },
      });

      expect(updatedDraft).not.toBeNull();
      expect(updatedDraft?.productId).toBeNull();
    });
  });

  describe('SystemConfig Model', () => {
    it('creates, queries, and updates system configuration keys', async () => {
      const config = await prisma.systemConfig.upsert({
        where: { key: 'HERMES_API_KEY' },
        update: { value: 'hermes-secret-key-2026' },
        create: {
          key: 'HERMES_API_KEY',
          value: 'hermes-secret-key-2026',
          description: 'API key for authenticating external Hermes AI agents',
        },
      });

      expect(config.key).toBe('HERMES_API_KEY');
      expect(config.value).toBe('hermes-secret-key-2026');

      const found = await prisma.systemConfig.findUnique({
        where: { key: 'HERMES_API_KEY' },
      });
      expect(found?.value).toBe('hermes-secret-key-2026');
      expect(found?.description).toBe('API key for authenticating external Hermes AI agents');

      const updated = await prisma.systemConfig.update({
        where: { key: 'HERMES_API_KEY' },
        data: { value: 'updated-hermes-key-2026' },
      });
      expect(updated.value).toBe('updated-hermes-key-2026');
    });
  });
});
