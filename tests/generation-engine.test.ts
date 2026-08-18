import { describe, it, expect } from 'vitest';
import {
  buildGenerationPrompt,
  parseHermesGenerationResponse,
  generateDraftWithHermes,
  GENERATION_ANGLES,
} from '../src/lib/generation-engine';

describe('Hermes Content Generation Engine Overhaul', () => {
  it('provides tactical directives instead of rigid sentence templates in angles', () => {
    expect(GENERATION_ANGLES.length).toBeGreaterThanOrEqual(5);
    GENERATION_ANGLES.forEach((angle) => {
      expect(angle.directive).toBeTruthy();
      // Should NOT contain fill-in-the-blank templates
      expect(angle.directive).not.toContain('padahal aslinya ...');
      expect(angle.directive).not.toContain('Pernah gak lagi asik ...');
    });
  });

  it('builds a high-converting commercial promo prompt when product is provided', () => {
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
      angle: 'unpopular_truth',
    });

    expect(prompt).toContain('Canva Pro Lifetime');
    expect(prompt).toContain('tokodigital.id');
    expect(prompt).toContain('PRODUK YANG AKAN DIPROMOSIKAN');
    expect(prompt).toContain('DILARANG MEMAKAI PEMBUKA KLISE');
    // Ensure slang shopping list is removed
    expect(prompt).not.toContain('e.g. gess, sat-set, boncos, worth it, nugas');
  });

  it('builds a 100% pure educational prompt with ZERO SELLING when product is null', () => {
    const prompt = buildGenerationPrompt({
      product: null,
      store: {
        name: 'Toko Digital ID',
        username: 'tokodigital.id',
      },
      angle: 'actionable_framework',
      customTopic: '4 Langkah Mengatur Workspace Digital Biar Bebas Distraksi',
    });

    expect(prompt).toContain('KONTEN ORGANIK MURNI (100% EDUKASI & INSIGHT BERBOBOT)');
    expect(prompt).toContain('DILARANG KERAS BERJUALAN');
    expect(prompt).toContain('DILARANG menyebut harga');
    expect(prompt).toContain('4 Langkah Mengatur Workspace Digital');
    // Ensure CTA is soft-community, not transactional
    expect(prompt).toContain('Bookmark / save thread');
  });

  it('injects rich knowledge vault notes into prompt when knowledgeTopic is provided', () => {
    const prompt = buildGenerationPrompt({
      product: null,
      store: {
        name: 'Toko Digital ID',
        username: 'tokodigital.id',
      },
      knowledgeTopic: {
        id: 'prompt-engineering-framework',
        title: 'Formula 4 Langkah Prompting AI',
        category: 'AI & Tech',
        tags: ['ai', 'prompting'],
        summary: 'Cara membuat prompt AI tanpa gaya robotik.',
        content: '1. Role persona\n2. Context\n3. Constraint\n4. Few-shot example',
      },
    });

    expect(prompt).toContain('Formula 4 Langkah Prompting AI');
    expect(prompt).toContain('AI & Tech');
    expect(prompt).toContain('1. Role persona');
    expect(prompt).toContain('DILARANG KERAS BERJUALAN');
  });

  it('injects negative historical hooks to avoid into prompt when provided', () => {
    const prompt = buildGenerationPrompt({
      product: { name: 'Canva Pro' },
      store: { name: 'Toko Digital ID', username: 'tokodigital.id' },
      historyHooksToAvoid: [
        'Kehilangan project 15 juta gara-gara akun crack 🧵👇',
        'Trik rahasia beresin tugas desain dalam 5 menit 🧵👇',
      ],
      excludeCollisions: ['Jangan gunakan analogi desainer vs klien'],
    });

    expect(prompt).toContain('HINDARI FORMULA & HOOK SEBELUMNYA (NEGATIVE CONTEXT');
    expect(prompt).toContain('Kehilangan project 15 juta');
    expect(prompt).toContain('Jangan gunakan analogi desainer vs klien');
  });

  it('parses valid JSON generation response from Hermes AI', () => {
    const raw = JSON.stringify({
      title: 'Realita Workflow Desain 2026',
      hookAngle: 'Unpopular Industry Truth',
      posts: [
        { orderIndex: 0, content: 'Tiga jam kerjaan hilang karena software tiba-tiba freeze di tengah render 🧵👇' },
        { orderIndex: 1, content: 'Banyak yang menyepelekan stabilitas tools kerja sampai akhirnya kena masalah sendiri.' },
        { orderIndex: 2, content: 'Selalu pastikan workspace digital kalian aman dan stabil sebelum deadline tiba.' },
      ],
    });

    const parsed = parseHermesGenerationResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('Realita Workflow Desain 2026');
    expect(parsed?.posts.length).toBe(3);
  });
});
