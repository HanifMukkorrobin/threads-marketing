import { describe, it, expect, vi } from 'vitest';
import { parseHermesJsonResponse, buildRevisionPrompt } from '../src/lib/hermes-client';
import { reviseDraftContent } from '../src/lib/revision-engine';

describe('Hermes Client & Response Parser', () => {
  it('parses pure JSON string correctly', () => {
    const raw = JSON.stringify({
      posts: [
        { orderIndex: 0, content: 'Hook post baru 🧵👇' },
        { orderIndex: 1, content: 'Value post baru' },
        { orderIndex: 2, content: 'CTA post baru' },
      ],
      revisedPartIndex: 0,
      explanation: 'Hook berhasil diubah jadi lebih menarik.',
    });

    const parsed = parseHermesJsonResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.posts.length).toBe(3);
    expect(parsed?.revisedPartIndex).toBe(0);
    expect(parsed?.explanation).toBe('Hook berhasil diubah jadi lebih menarik.');
  });

  it('strips markdown code fences (```json ... ```) and parses JSON', () => {
    const raw = "```json\n" + JSON.stringify({
      posts: [
        { orderIndex: 0, content: 'Post 1' },
        { orderIndex: 1, content: 'Post 2' },
        { orderIndex: 2, content: 'Post 3' },
      ],
      revisedPartIndex: 2,
      explanation: 'CTA diperbarui dengan urgensi diskon.',
    }) + "\n```";

    const parsed = parseHermesJsonResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.revisedPartIndex).toBe(2);
    expect(parsed?.explanation).toBe('CTA diperbarui dengan urgensi diskon.');
  });

  it('builds a comprehensive prompt with product USP, pricing, and revision instruction', () => {
    const prompt = buildRevisionPrompt({
      posts: [
        { orderIndex: 0, content: 'Pernah kena iklan? 😤' },
        { orderIndex: 1, content: 'Beli YouTube Premium cuma 5rb' },
        { orderIndex: 2, content: 'DM sekarang' },
      ],
      product: {
        name: 'YouTube Premium',
        category: 'Streaming',
        variants: [{ name: '1 Bulan', price: 5000 }],
        usp: ['Full Garansi', 'Aktivasi Kilat'],
      },
      store: {
        name: 'Toko Digital ID',
        username: 'tokodigital.id',
      },
      instruction: 'Ubah post 1 jadi hook curhat relate mahasiswa nugas',
    });

    expect(prompt).toContain('YouTube Premium');
    expect(prompt).toContain('Full Garansi');
    expect(prompt).toContain('Ubah post 1 jadi hook curhat relate mahasiswa nugas');
    expect(prompt).toContain('tokodigital.id');
  });
});

describe('Hermes Revision Engine (Async & Humanizer ID)', () => {
  const initialPosts = [
    { orderIndex: 0, content: 'Post 1 awal 🧵👇' },
    { orderIndex: 1, content: 'Post 2 value awal' },
    { orderIndex: 2, content: 'Post 3 CTA awal' },
  ];

  it('calls Hermes AI and returns revised posts structure', async () => {
    const result = await reviseDraftContent({
      posts: initialPosts,
      product: {
        name: 'Spotify Premium',
        variants: [{ name: 'Individual 1 Bulan', price: 10000 }],
        usp: ['Akun Region Indo', 'Full Garansi'],
      },
      store: {
        name: 'Toko Digital ID',
        username: 'tokodigital.id',
      },
      instruction: 'bikin post 3 lebih santai ajak DM dan sebut kuota 5 slot',
    });

    expect(result.posts.length).toBe(3);
    expect(result.posts[0].content).toBeTruthy();
    expect(result.posts[1].content).toBeTruthy();
    expect(result.posts[2].content).toBeTruthy();
    expect(result.explanation).toBeTruthy();
    // Posts must be under 500 characters
    result.posts.forEach((p) => {
      expect(p.content.length).toBeLessThanOrEqual(500);
    });
  }, 60000);
});
