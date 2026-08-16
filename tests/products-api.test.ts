import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getProducts, POST as createProduct } from '../src/app/api/products/route';
import {
  GET as getProductById,
  PUT as updateProduct,
  DELETE as deleteProduct,
  PATCH as patchProduct,
} from '../src/app/api/products/[id]/route';

describe('Products Internal API Routes (`/api/products`)', () => {
  beforeAll(async () => {
    await prisma.draftPostItem.deleteMany();
    await prisma.contentDraft.deleteMany();
    await prisma.product.deleteMany();
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
    await prisma.product.deleteMany();
  });

  describe('GET /api/products', () => {
    it('returns empty list when no products exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/products');
      const res = await getProducts(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('returns all products with parsed variants and usp', async () => {
      await prisma.product.create({
        data: {
          name: 'Canva Pro Edu',
          slug: 'canva-pro-edu',
          category: 'Design & Tools',
          description: 'Akun Canva Pro Lifetime',
          variants: JSON.stringify([{ name: '1 Tahun', price: 35000 }]),
          usp: JSON.stringify(['Aktivasi Cepat', 'Garansi Penuh']),
          targetAudience: 'Content Creators, Students',
          toneOfVoice: 'Helpful & Energetic',
          ctaTemplate: 'Cek link di bio untuk order!',
          isActive: true,
        },
      });

      const req = new NextRequest('http://localhost:3000/api/products');
      const res = await getProducts(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Canva Pro Edu');
      expect(Array.isArray(body.data[0].variants)).toBe(true);
      expect(body.data[0].variants[0].name).toBe('1 Tahun');
      expect(body.data[0].variants[0].price).toBe(35000);
      expect(Array.isArray(body.data[0].usp)).toBe(true);
      expect(body.data[0].usp).toContain('Aktivasi Cepat');
    });

    it('filters products by ?search= across name, category, and description', async () => {
      await prisma.product.create({
        data: {
          name: 'Netflix Premium 4K UHD',
          slug: 'netflix-premium',
          category: 'Streaming Video',
          description: 'Akun sharing 1 profil 1 user',
          variants: JSON.stringify([{ name: '1 Bulan', price: 35000 }]),
          usp: JSON.stringify(['Anti On-Hold']),
          isActive: true,
        },
      });

      await prisma.product.create({
        data: {
          name: 'Spotify Premium Individual',
          slug: 'spotify-premium',
          category: 'Music',
          description: 'Aktivasi plan family invitation',
          variants: JSON.stringify([{ name: '3 Bulan', price: 45000 }]),
          usp: JSON.stringify(['No Ads']),
          isActive: true,
        },
      });

      // Search by name
      const req1 = new NextRequest('http://localhost:3000/api/products?search=netflix');
      const res1 = await getProducts(req1);
      const body1 = await res1.json();
      expect(body1.data.length).toBe(1);
      expect(body1.data[0].name).toContain('Netflix');

      // Search by description keyword
      const req2 = new NextRequest('http://localhost:3000/api/products?search=family');
      const res2 = await getProducts(req2);
      const body2 = await res2.json();
      expect(body2.data.length).toBe(1);
      expect(body2.data[0].name).toContain('Spotify');
    });

    it('filters products by ?category=', async () => {
      await prisma.product.create({
        data: {
          name: 'ChatGPT Plus Shared',
          slug: 'chatgpt-plus',
          category: 'AI & Productivity',
          variants: '[]',
          usp: '[]',
          isActive: true,
        },
      });

      await prisma.product.create({
        data: {
          name: 'YouTube Premium',
          slug: 'youtube-premium',
          category: 'Streaming Video',
          variants: '[]',
          usp: '[]',
          isActive: true,
        },
      });

      const req = new NextRequest('http://localhost:3000/api/products?category=AI+%26+Productivity');
      const res = await getProducts(req);
      const body = await res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('ChatGPT Plus Shared');
    });
  });

  describe('POST /api/products', () => {
    it('creates a new product with auto-generated slug', async () => {
      const payload = {
        name: 'Disney+ Hotstar 1 Month',
        category: 'Streaming Video',
        description: 'Streaming film favorit',
        variants: [{ name: '1 Bulan', price: 29000, duration: '30 hari' }],
        usp: ['Full Garansi', 'Kualitas HD/4K'],
        targetAudience: 'Movie lovers',
        toneOfVoice: 'Casual & Exciting',
        ctaTemplate: 'Amankan slot kamu via link di bio!',
        isActive: true,
      };

      const req = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await createProduct(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe(payload.name);
      expect(body.data.slug).toBe('disney-hotstar-1-month');
      expect(Array.isArray(body.data.variants)).toBe(true);
      expect(body.data.variants[0].price).toBe(29000);
      expect(body.data.usp).toContain('Full Garansi');
    });

    it('handles slug collisions automatically', async () => {
      await prisma.product.create({
        data: {
          name: 'Duplicate Product',
          slug: 'duplicate-product',
          category: 'Tools',
          variants: '[]',
          usp: '[]',
        },
      });

      const payload = {
        name: 'Duplicate Product',
        category: 'Tools',
        variants: [],
        usp: [],
      };

      const req = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await createProduct(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.slug).not.toBe('duplicate-product');
      expect(body.data.slug).toMatch(/^duplicate-product-/);
    });

    it('validates required fields (name, category)', async () => {
      const invalidPayload = {
        description: 'Missing name and category',
      };

      const req = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      const res = await createProduct(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });

  describe('GET /api/products/[id]', () => {
    it('returns a single product by id with parsed fields', async () => {
      const prod = await prisma.product.create({
        data: {
          name: 'Claude Pro Account',
          slug: 'claude-pro',
          category: 'AI & Productivity',
          variants: JSON.stringify([{ name: '1 Bulan', price: 99000 }]),
          usp: JSON.stringify(['Direct Login', 'Opus Access']),
          isActive: true,
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/products/${prod.id}`);
      const res = await getProductById(req, { params: { id: prod.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Claude Pro Account');
      expect(body.data.variants[0].name).toBe('1 Bulan');
    });

    it('returns 404 for non-existent product id', async () => {
      const req = new NextRequest('http://localhost:3000/api/products/non-existent-id');
      const res = await getProductById(req, { params: { id: 'non-existent-id' } });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  describe('PUT /api/products/[id]', () => {
    it('updates product fields including variants and usp tags', async () => {
      const prod = await prisma.product.create({
        data: {
          name: 'Grammarly Premium',
          slug: 'grammarly-premium',
          category: 'Education',
          variants: JSON.stringify([{ name: '1 Bulan', price: 20000 }]),
          usp: JSON.stringify(['Private Account']),
          isActive: true,
        },
      });

      const updatePayload = {
        name: 'Grammarly Premium Business',
        category: 'Productivity',
        description: 'Grammarly Business Plan with AI',
        variants: [
          { name: '1 Bulan', price: 25000 },
          { name: '1 Tahun', price: 120000 },
        ],
        usp: ['Private Account', 'Unlimited Words', 'Garansi Penuh'],
        targetAudience: 'Writers & Students',
        toneOfVoice: 'Professional',
        ctaTemplate: 'Tingkatkan kualitas tulisanmu sekarang!',
        isActive: false,
      };

      const req = new NextRequest(`http://localhost:3000/api/products/${prod.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const res = await updateProduct(req, { params: { id: prod.id } });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Grammarly Premium Business');
      expect(body.data.category).toBe('Productivity');
      expect(body.data.variants.length).toBe(2);
      expect(body.data.usp.length).toBe(3);
      expect(body.data.isActive).toBe(false);
    });

    it('returns 404 when updating non-existent product', async () => {
      const req = new NextRequest('http://localhost:3000/api/products/missing-id', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'New Name', category: 'General' }),
      });

      const res = await updateProduct(req, { params: { id: 'missing-id' } });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/products/[id]', () => {
    it('toggles isActive status', async () => {
      const prod = await prisma.product.create({
        data: {
          name: 'Toggle Test Product',
          slug: 'toggle-test',
          category: 'Testing',
          variants: '[]',
          usp: '[]',
          isActive: true,
        },
      });

      // Toggle off
      const req1 = new NextRequest(`http://localhost:3000/api/products/${prod.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      const res1 = await patchProduct(req1, { params: { id: prod.id } });
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.data.isActive).toBe(false);

      // Toggle on
      const req2 = new NextRequest(`http://localhost:3000/api/products/${prod.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      const res2 = await patchProduct(req2, { params: { id: prod.id } });
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.data.isActive).toBe(true);
    });

    it('returns 404 for non-existent product on PATCH', async () => {
      const req = new NextRequest('http://localhost:3000/api/products/missing-id', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      const res = await patchProduct(req, { params: { id: 'missing-id' } });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/products/[id]', () => {
    it('deletes product and preserves linked draft with null productId', async () => {
      const prod = await prisma.product.create({
        data: {
          name: 'Product to Delete',
          slug: 'product-to-delete',
          category: 'Tools',
          variants: '[]',
          usp: '[]',
        },
      });

      const draft = await prisma.contentDraft.create({
        data: {
          productId: prod.id,
          title: 'Draft for Product to Delete',
          type: 'SINGLE',
          posts: {
            create: [{ orderIndex: 0, content: 'Post content' }],
          },
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/products/${prod.id}`, {
        method: 'DELETE',
      });
      const res = await deleteProduct(req, { params: { id: prod.id } });
      expect(res.status).toBe(200);

      // Verify product is deleted
      const checkProd = await prisma.product.findUnique({ where: { id: prod.id } });
      expect(checkProd).toBeNull();

      // Verify draft is still present but productId is null
      const checkDraft = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
      expect(checkDraft).not.toBeNull();
      expect(checkDraft?.productId).toBeNull();
    });

    it('returns 404 when deleting non-existent product', async () => {
      const req = new NextRequest('http://localhost:3000/api/products/missing-id', {
        method: 'DELETE',
      });
      const res = await deleteProduct(req, { params: { id: 'missing-id' } });
      expect(res.status).toBe(404);
    });
  });
});
