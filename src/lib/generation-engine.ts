/**
 * Dynamic Content Generation Engine (Overhaul v2)
 * Powered by Hermes AI Agent (ag/gemini-3.6-flash-high)
 * 
 * Core Principles:
 * 1. Zero Template Mad-Libs: Directives instead of sentence fill-in-the-blanks.
 * 2. Authentic Practitioner Persona: Natural Indonesian without forced slang wordlists.
 * 3. Strict Separation: Commercial Promos (high conversion) vs Pure Organic (100% value, zero selling).
 * 4. Obsidian Knowledge Vault Integration: Ingests real research notes for organic streams.
 * 5. Hybrid Deduplication & Freshness Guard (Ollama Vector + Lexical Fallback + Negative Context).
 */

import { callHermesChatCompletion } from './hermes-client';
import {
  getRecentDraftHistory,
  validateDraftFreshness,
  FreshnessValidationResult,
  HistoricalDraftItem,
} from './content-deduplication';
import {
  KnowledgeTopic,
  loadAllKnowledgeTopics,
  selectLRUKnowledgeTopic,
} from './knowledge-wiki';

export interface GenerationAngle {
  id: string;
  name: string;
  description: string;
  directive: string;
}

export const GENERATION_ANGLES: GenerationAngle[] = [
  {
    id: 'unpopular_truth',
    name: 'Unpopular Industry Truth',
    description: 'Menentang kebiasaan umum yang keliru dengan logika teknis atau realita pahit.',
    directive: 'Mulai langsung dengan fakta mengejutkan, konsekuensi tak terduga, atau paradoks industri tanpa basa-basi.',
  },
  {
    id: 'real_case_study',
    name: 'Real Case & Breakdown Skenario',
    description: 'Bedah skenario nyata saat deadline, workflow macet, atau risiko keamanan.',
    directive: 'Mulai dengan deskripsi situasi spesifik (waktu, jenis project, kepanikan nyata) tanpa kalimat pengantar klise.',
  },
  {
    id: 'workflow_teardown',
    name: 'Workflow & Tool Teardown',
    description: 'Perbandingan tajam antara cara lama yang melelahkan vs cara modern yang efektif.',
    directive: 'Tunjukkan kontras jam kerja (misal: 4 jam manual vs 10 menit otomatis) atau efisiensi proses.',
  },
  {
    id: 'cost_math_contrast',
    name: 'Real Math & Cost Analysis',
    description: 'Perhitungan matematis pengeluaran tersembunyi vs nilai investasi jangka panjang.',
    directive: 'Tampilkan perbandingan rupiah konkret atau rasio biaya harian vs risiko kerugian waktu.',
  },
  {
    id: 'actionable_framework',
    name: 'Actionable Framework / Step-by-Step',
    description: 'Panduan taktis step-by-step yang bisa langsung dipraktekkan hari ini.',
    directive: 'Bagi menjadi 3 langkah konkret yang bisa dieksekusi tanpa teori bertele-tele.',
  },
  {
    id: 'tool_curation',
    name: 'Curation & High-Utility Insights',
    description: 'Kurasi tools atau teknik tersembunyi yang jarang diketahui orang.',
    directive: 'Langsung sorot fungsi terkuat dan problem nyata yang diselesaikan tanpa pengantar panjang.',
  },
];

export interface GenerationInput {
  product?: {
    id?: string;
    name?: string;
    category?: string;
    description?: string | null;
    variants?: Array<{ name: string; price: number; duration?: string }>;
    usp?: string[];
    targetAudience?: string | null;
    toneOfVoice?: string | null;
    ctaTemplate?: string | null;
  } | null;
  store?: {
    name?: string;
    username?: string;
  } | null;
  knowledgeTopic?: KnowledgeTopic | null;
  angle?: string | null;
  customTopic?: string | null;
  targetAudience?: string | null;
  historyHooksToAvoid?: string[];
  excludeCollisions?: string[];
}

export interface GenerationResult {
  title: string;
  hookAngle: string;
  posts: Array<{ orderIndex: number; content: string; mediaUrl?: string | null }>;
  metadata?: Record<string, any>;
}

/**
 * Builds the AI generation prompt with strict anti-cliche, negative context, and humanizer rules
 */
export function buildGenerationPrompt(input: GenerationInput): string {
  const { product, store, angle, customTopic, knowledgeTopic, targetAudience, historyHooksToAvoid, excludeCollisions } = input;
  const storeName = store?.name || 'Toko Digital ID';
  const storeHandle = store?.username || 'tokodigital.id';

  const selectedAngleObj =
    GENERATION_ANGLES.find((a) => a.id === angle || a.name === angle) || GENERATION_ANGLES[0];
  const angleName = selectedAngleObj?.name || 'Unpopular Industry Truth';
  const angleDirective = selectedAngleObj?.directive || 'Langsung masuk ke inti masalah secara tajam.';

  let negativeContextSection = '';
  if (historyHooksToAvoid && historyHooksToAvoid.length > 0) {
    negativeContextSection = `
HINDARI FORMULA & HOOK SEBELUMNYA (NEGATIVE CONTEXT / ANTI-REPETISI):
Berikut adalah hook yang SUDAH PERNAH DITERBITKAN sebelumnya. DILARANG membuat hook, analogi, atau formula kalimat yang mirip dengan daftar ini:
${historyHooksToAvoid.slice(0, 15).map((h, idx) => `${idx + 1}. "${h}"`).join('\n')}
Wajib buat sudut pandang, analogi, dan gaya pembuka yang 100% segar, unik, dan tidak mengulang pola di atas!
`.trim();
  }

  let collisionWarningSection = '';
  if (excludeCollisions && excludeCollisions.length > 0) {
    collisionWarningSection = `
PERINGATAN COLLISION SEBELUMNYA (RETRY GENERATION):
${excludeCollisions.map((c) => `⚠️ ${c}`).join('\n')}
Gunakan konsep pembuka yang sama sekali berbeda dari percobaan sebelumnya!
`.trim();
  }

  // BRANCH 1: PRODUCT PROMOTIONAL THREAD (Commercial / High-Converting)
  if (product) {
    const variantsStr = product.variants?.length
      ? product.variants.map((v) => `• ${v.name}: Rp ${v.price.toLocaleString('id-ID')}${v.duration ? ` (${v.duration})` : ''}`).join('\n')
      : '• Harga hemat terjangkau';
    const uspsStr = product.usp?.length
      ? product.usp.map((u) => `✅ ${u}`).join('\n')
      : '✅ Full garansi replace\n✅ Proses instan hitungan menit';

    return `
PANDUAN PEMBUATAN THREAD PROMOSI PRODUK (THREADS META):
Kamu adalah Digital Copywriter profesional yang ahli membuat konten viral berkonversi tinggi. Gaya bahasa: Indonesia kasual, cerdas, percaya diri, tanpa basa-basi marketing murahan.

INFORMASI BISNIS & PRODUK:
- Toko: ${storeName} (@${storeHandle})
PRODUK YANG AKAN DIPROMOSIKAN:
- Nama Produk: ${product.name}
- Kategori: ${product.category || 'Digital Service'}
- Target Audiens: ${targetAudience || product.targetAudience || 'Mahasiswa, Profesional, Freelancer'}
- Varian & Harga Resmi:
${variantsStr}
- Keunggulan Utama (USP):
${uspsStr}
- Call to Action: ${product.ctaTemplate || `Amankan slot resmi via link di bio @${storeHandle}!`}

ARAHAN SUDUT PANDANG (ANGLE):
- Angle: ${angleName}
- Taktik Eksekusi: ${angleDirective}
${customTopic ? `- Fokus Tambahan: "${customTopic}"` : ''}

${negativeContextSection ? `${negativeContextSection}\n\n` : ''}${collisionWarningSection ? `${collisionWarningSection}\n\n` : ''}ATURAN PENULISAN KETAT:
1. DILARANG MEMAKAI PEMBUKA KLISE:
   - JANGAN mulai dengan: "Banyak orang ngira...", "Pernah gak sih...", "Tahukah kamu...", "Di era digital...", "Siapa sangka...", "Jangan lewatkan...", "Kabar gembira...".
   - Buka langsung dengan: Angka riil, kerugian konkret, situasi spesifik, atau opini berani to-the-point!
2. JANGAN memaksakan daftar kata slang template. Tulis mengalir secara natural selayaknya praktisi digital yang sedang berbagi solusi.
3. Struktur 3 Post Thread:
   - Post #1 (Hook Utama): Ketegangan masalah / kontras fakta + diakhiri indikator thread "🧵👇".
   - Post #2 (Solusi & Bukti Nilai): Nilai produk nyata, daftar paket/harga resmi, dan jaminan keamanan.
   - Post #3 (Action & CTA Transaksional): Ajakan order jelas mengarah ke bio/DM @${storeHandle}.
4. Setiap post HARUS DI BAWAH 500 KARAKTER (Batas Threads).

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON BERIKUT (TANPA MARKDOWN FENCES / TEKS LAIN):
{
  "title": "Judul Draft Singkat & Menarik",
  "hookAngle": "${angleName}",
  "posts": [
    { "orderIndex": 0, "content": "Teks post 1 (Hook)... 🧵👇" },
    { "orderIndex": 1, "content": "Teks post 2 (Value & Harga)..." },
    { "orderIndex": 2, "content": "Teks post 3 (CTA ke @${storeHandle})..." }
  ]
}
`.trim();
  }

  // BRANCH 2: PURE ORGANIC EDUCATIONAL THREAD (100% Value, Zero Selling)
  let topicContext = '';
  if (knowledgeTopic) {
    topicContext = `
KONTEN ORGANIK MURNI (100% EDUKASI & INSIGHT BERBOBOT DARI KNOWLEDGE VAULT):
- Judul Materi: ${knowledgeTopic.title}
- Kategori: ${knowledgeTopic.category}
- Ringkasan Inti: ${knowledgeTopic.summary || 'Insight bernilai tinggi'}
- Target Audiens: ${targetAudience || knowledgeTopic.targetAudience || 'Pengguna Threads aktif, mahasiswa, freelancer, digital creator'}
- Bahan Riset / Poin Pengetahuan:
${knowledgeTopic.content}
- Profil Penulis: @${storeHandle}
`.trim();
  } else {
    topicContext = `
KONTEN ORGANIK MURNI (100% EDUKASI & INSIGHT BERBOBOT):
- Topik / Fokus Materi: ${customTopic || 'Framework produktivitas kerja, tips prompt AI, atau efisiensi tools digital 2026'}
- Target Audiens: ${targetAudience || 'Pengguna Threads aktif, mahasiswa, freelancer, digital creator'}
- Profil Penulis: @${storeHandle}
`.trim();
  }

  return `
PANDUAN PEMBUATAN THREAD ORGANIK EDUKASI (THREADS META):
Kamu adalah Edukator & Praktisi Digital Tech yang berbagi wawasan berbobot tinggi. Gaya bahasa: Cerdas, santai, to-the-point, sangat aplikatif.

${topicContext}

ARAHAN SUDUT PANDANG (ANGLE):
- Angle: ${angleName}
- Taktik Eksekusi: ${angleDirective}

${negativeContextSection ? `${negativeContextSection}\n\n` : ''}${collisionWarningSection ? `${collisionWarningSection}\n\n` : ''}ATURAN PENULISAN KETAT:
1. DILARANG KERAS BERJUALAN:
   - DILARANG menyebut harga produk jualan, stok, promo akun, atau embel-embel jualan.
   - Konten ini 100% murni edukasi, insight teknis, atau tips praktis yang langsung bisa dicoba.
2. DILARANG MEMAKAI PEMBUKA KLISE:
   - JANGAN mulai dengan: "Banyak orang ngira...", "Pernah gak sih...", "Tahukah kamu...", "Di era modern...", "Siapa sangka...".
   - Buka langsung dengan inti insight atau pernyataan menohok.
3. Struktur 3 Post Thread:
   - Post #1 (Hook Wawasan): Masalah / konsep menarik yang memicu rasa ingin tahu + diakhiri "🧵👇".
   - Post #2 (Daging Materi / Actionable Value): Breakdown langkah nyata, formula, atau poin praktis.
   - Post #3 (Penutup Komunitas): Bookmark / save thread buat referensi nanti, ajakan diskusi di replies, atau soft-follow ke @${storeHandle} untuk tips seputar digital harian.
4. Setiap post HARUS DI BAWAH 500 KARAKTER.

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON BERIKUT (TANPA MARKDOWN FENCES / TEKS LAIN):
{
  "title": "Judul Wawasan Edukasi",
  "hookAngle": "${angleName}",
  "posts": [
    { "orderIndex": 0, "content": "Teks post 1 (Hook wawasan)... 🧵👇" },
    { "orderIndex": 1, "content": "Teks post 2 (Langkah & Value)..." },
    { "orderIndex": 2, "content": "Teks post 3 (Penutup & Diskusi)..." }
  ]
}
`.trim();
}

/**
 * Parses JSON generation response from Hermes AI
 */
export function parseHermesGenerationResponse(rawText: string): GenerationResult | null {
  if (!rawText || typeof rawText !== 'string') return null;

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  const parseObj = (obj: any): GenerationResult | null => {
    if (obj && Array.isArray(obj.posts) && obj.posts.length >= 2) {
      return {
        title: String(obj.title || 'Draft Threads Baru'),
        hookAngle: String(obj.hookAngle || 'Unpopular Industry Truth'),
        posts: obj.posts.map((p: any, idx: number) => ({
          orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : idx,
          content: String(p.content || '').slice(0, 500),
          mediaUrl: p.mediaUrl || null,
        })),
        metadata: {
          generatedBy: 'hermes-ai-generation-engine',
          model: 'ag/gemini-3.6-flash-high',
          generatedAt: new Date().toISOString(),
        },
      };
    }
    return null;
  };

  try {
    const parsed = JSON.parse(cleaned);
    const res = parseObj(parsed);
    if (res) return res;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const jsonSub = cleaned.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonSub);
        const res = parseObj(parsed);
        if (res) return res;
      } catch {
        // fallback
      }
    }
  }

  return null;
}

/**
 * Generates fresh, non-generic thread drafts via Hermes AI Agent
 * Validates freshness and auto-retries up to 2 times on collision
 */
export async function generateDraftWithHermes(input: GenerationInput): Promise<GenerationResult> {
  let history: HistoricalDraftItem[] = [];
  try {
    history = await getRecentDraftHistory(input.product?.id || null, 15);
  } catch {
    history = [];
  }

  // Auto-feed from Obsidian Knowledge Vault if organic and no topic provided
  let activeKnowledgeTopic = input.knowledgeTopic || null;
  if (!input.product && !activeKnowledgeTopic && !input.customTopic) {
    try {
      const allTopics = await loadAllKnowledgeTopics();
      if (allTopics.length > 0) {
        activeKnowledgeTopic = selectLRUKnowledgeTopic(allTopics, history as any);
      }
    } catch (err) {
      console.warn('[Knowledge Sourcing] Could not load vault topics:', err);
    }
  }

  const effectiveInput: GenerationInput = {
    ...input,
    knowledgeTopic: activeKnowledgeTopic,
  };

  const historyHooks = input.historyHooksToAvoid || history.map((h) => h.hookContent);
  const excludeCollisions: string[] = [...(input.excludeCollisions || [])];

  const maxAttempts = 2;
  let lastFreshnessCheck: FreshnessValidationResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const prompt = buildGenerationPrompt({
      ...effectiveInput,
      historyHooksToAvoid: historyHooks,
      excludeCollisions: excludeCollisions.length > 0 ? excludeCollisions : undefined,
    });

    try {
      const rawResponse = await callHermesChatCompletion(prompt);
      const candidate = parseHermesGenerationResponse(rawResponse);

      if (candidate && candidate.posts.length >= 2) {
        const hookText = candidate.posts[0]?.content || candidate.title;
        const fullText = candidate.posts.map((p) => p.content).join('\n\n');

        const freshness = await validateDraftFreshness(hookText, fullText, history);
        lastFreshnessCheck = freshness;

        if (freshness.isFresh || attempt === maxAttempts) {
          candidate.metadata = {
            ...(candidate.metadata || {}),
            freshnessCheck: freshness,
            attemptsCount: attempt,
            ...(activeKnowledgeTopic
              ? {
                  generatedFrom: 'OBSIDIAN_KNOWLEDGE_VAULT',
                  sourceTopicId: activeKnowledgeTopic.id,
                  sourceTopicTitle: activeKnowledgeTopic.title,
                  sourceCategory: activeKnowledgeTopic.category,
                }
              : {}),
          };
          return candidate;
        }

        // Collision detected, record warning for next attempt
        console.warn(`[Hermes Generation] Collision attempt ${attempt}: ${freshness.reason}`);
        if (freshness.reason) {
          excludeCollisions.push(freshness.reason);
        }
      }
    } catch (err: any) {
      console.warn(`[Hermes AI Attempt ${attempt}] Failed:`, err?.message || err);
    }
  }

  // Fallback dynamic generator if AI is unreachable
  const storeHandle = input.store?.username || 'tokodigital.id';
  const selectedAngle = GENERATION_ANGLES.find((a) => a.id === input.angle) || GENERATION_ANGLES[0];

  if (input.product) {
    const prodName = input.product.name || 'layanan digital';
    return {
      title: `[${selectedAngle.name.split('/')[0].trim()}] ${prodName}`,
      hookAngle: selectedAngle.name,
      posts: [
        {
          orderIndex: 0,
          content: `Kehilangan waktu berjam-jam gara-gara akun kerja bermasalah di tengah deadline itu bencana nyata 💡\n\nNih solusi stabil untuk ${prodName} resmi 🧵👇`,
        },
        {
          orderIndex: 1,
          content: `Benefit yang kamu dapatkan:\n${(input.product.usp || ['100% Legal & Bergaransi', 'Aktivasi Instan']).slice(0, 3).map((u) => `✅ ${u}`).join('\n')}\n\nLogin resmi tanpa VPN aneh-aneh.`,
        },
        {
          orderIndex: 2,
          content: `Amankan slot resmi sekarang sebelum kehabisan kuota hari ini.\n\n👉 Info lengkap & order langsung cek bio @${storeHandle}! 🚀`,
        },
      ],
      metadata: {
        generatedBy: 'hermes-fallback-engine',
        generatedAt: new Date().toISOString(),
        freshnessCheck: lastFreshnessCheck || { isFresh: true, method: 'none', score: 0, threshold: 0.7 },
      },
    };
  }

  // Fallback for organic education (Zero Selling)
  const topicTitle = activeKnowledgeTopic?.title || input.customTopic || '3 Trik Workflow Digital 2026';
  return {
    title: `[Insight] ${topicTitle}`,
    hookAngle: selectedAngle.name,
    posts: [
      {
        orderIndex: 0,
        content: `Bekerja lebih cerdas bukan berarti nambah jam kerja, tapi mengeliminasi hal repetitif yang buang energi 🧠\n\n3 prinsip workflow digital yang wajib kamu tahu 🧵👇`,
      },
      {
        orderIndex: 1,
        content: `1. Otomasi tugas kecil yang makan waktu > 10 menit harian.\n2. Buat template reusable untuk dokumen dan komunikasi berulang.\n3. Blokir waktu fokus tanpa notifikasi di pagi hari.`,
      },
      {
        orderIndex: 2,
        content: `Simpan thread ini biar gak lupa pas butuh nanti! ✨\n\nFollow @${storeHandle} untuk update seputar insight tools digital & tips produktivitas harian.`,
      },
    ],
    metadata: {
      generatedBy: 'hermes-fallback-engine',
      generatedAt: new Date().toISOString(),
      freshnessCheck: lastFreshnessCheck || { isFresh: true, method: 'none', score: 0, threshold: 0.7 },
      ...(activeKnowledgeTopic
        ? {
            generatedFrom: 'OBSIDIAN_KNOWLEDGE_VAULT',
            sourceTopicId: activeKnowledgeTopic.id,
            sourceTopicTitle: activeKnowledgeTopic.title,
            sourceCategory: activeKnowledgeTopic.category,
          }
        : {}),
    },
  };
}
