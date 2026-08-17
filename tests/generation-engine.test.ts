import { describe, it, expect } from 'vitest';
import {
  buildGenerationPrompt,
  parseHermesGenerationResponse,
  generateDraftWithHermes,
  GENERATION_ANGLES,
} from '../src/lib/generation-engine';

describe('Hermes Content Generation Engine', () => {
  it('provides a diverse set of generation angles', () => {
    expect(GENERATION_ANGLES.length).toBeGreaterThanOrEqual(6);
    expect(GENERATION_ANGLES.some((a) => a.id === 'contrarian')).toBe(true);
    expect(GENERATION_ANGLES.some((a) => a.id === 'micro_story')).toBe(true);
    expect(GENERATION_ANGLES.some((a) => a.id === 'price_breakdown')).toBe(true);
  });

  it('builds a prompt with anti-generic guidelines for product promo', () => {
    const prompt = buildGenerationPrompt({
      product: {
        id: 'p1',
        name: 'Canva Pro Lifetime',
        category: 'Design Tools',
        variants: [{ name: 'Lifetime', price: 35000 }],
        usp: ['Akses Semua Elemen Pro', 'Brand Kit Aktif', 'Garansi Replace'],
      },
      store: {
        name: 'Toko Digital ID',
        username: 'tokodigital.id',
      },
      angle: 'contrarian',
    });

    expect(prompt).toContain('Canva Pro Lifetime');
    expect(prompt).toContain('tokodigital.id');
    expect(prompt).toContain('Contrarian');
    expect(prompt).toContain('ecommerce-copy-humanizer-id');
  });

  it('builds a prompt for organic engagement content when product is null', () => {
    const prompt = buildGenerationPrompt({
      product: null,
      store: {
        name: 'Toko Digital ID',
        username: 'tokodigital.id',
      },
      angle: 'productivity_hack',
      customTopic: '5 ekstensi browser wajib buat developer & designer',
    });

    expect(prompt).toContain('5 ekstensi browser wajib buat developer & designer');
    expect(prompt).toContain('KONTEN ORGANIK');
  });

  it('parses valid JSON generation response from Hermes AI', () => {
    const raw = JSON.stringify({
      title: 'Trik Rahasia Hemat Desain 2026',
      hookAngle: 'Contrarian / Unpopular Opinion',
      posts: [
        { orderIndex: 0, content: 'Banyak yang ngira bikin desain pro itu harus jago Photoshop 🧵👇' },
        { orderIndex: 1, content: 'Padahal pakai Canva Pro aja udah cukup banget buat 90% kebutuhan desain.' },
        { orderIndex: 2, content: 'Langsung amankan slot promo di @tokodigital.id ya gess! 🚀' },
      ],
    });

    const parsed = parseHermesGenerationResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('Trik Rahasia Hemat Desain 2026');
    expect(parsed?.posts.length).toBe(3);
    expect(parsed?.posts[0].content).toContain('Photoshop');
  });

  it('generates a fresh draft using Hermes Agent with all posts under 500 characters', async () => {
    const result = await generateDraftWithHermes({
      product: {
        name: 'YouTube Premium Sharing',
        category: 'Streaming Video',
        variants: [{ name: '1 Bulan', price: 5000 }],
        usp: ['Bebas Iklan', 'Background Play', 'Garansi Penuh'],
      },
      store: {
        name: 'Toko Digital ID',
        username: 'tokodigital.id',
      },
      angle: 'micro_story',
    });

    expect(result.title).toBeTruthy();
    expect(result.posts.length).toBeGreaterThanOrEqual(2);
    result.posts.forEach((p) => {
      expect(p.content.length).toBeLessThanOrEqual(500);
      expect(p.content.length).toBeGreaterThan(10);
    });
  }, 60000);
});

import { GET as getAnglesApi, POST as generateDraftApi } from '../src/app/api/drafts/generate/route';
import { prisma } from '../src/lib/prisma';
import { NextRequest } from 'next/server';

describe('API Route /api/drafts/generate', () => {
  it('GET returns the list of available angles', async () => {
    const res = await getAnglesApi();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.angles)).toBe(true);
    expect(json.angles.length).toBeGreaterThanOrEqual(6);
  });

  it('POST generates and returns a draft', async () => {
    const req = new NextRequest('http://localhost:3000/api/drafts/generate', {
      method: 'POST',
      body: JSON.stringify({
        angle: 'contrarian',
        customTopic: 'Mitos langganan Spotify bajakan vs resmi',
        autoSave: false,
      }),
    });

    const res = await generateDraftApi(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.title).toBeTruthy();
    expect(Array.isArray(json.data.posts)).toBe(true);
    expect(json.data.posts.length).toBeGreaterThanOrEqual(2);
  }, 60000);
});

