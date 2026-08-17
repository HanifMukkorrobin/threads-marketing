/**
 * Dynamic Content Generation Engine
 * Powered by Hermes AI Agent (ag/gemini-3.6-flash-high)
 * Adheres to /ecommerce-copy-humanizer-id
 * Generates fresh, non-generic, high-converting Threads marketing campaigns
 */

import { callHermesChatCompletion } from './hermes-client';

export interface GenerationAngle {
  id: string;
  name: string;
  description: string;
  hookHint: string;
}

export const GENERATION_ANGLES: GenerationAngle[] = [
  {
    id: 'contrarian',
    name: 'Contrarian / Unpopular Opinion',
    description: 'Menentang anggapan umum atau mitos keliru terkait produk/layanan digital',
    hookHint: 'Banyak orang ngira ..., padahal aslinya ...',
  },
  {
    id: 'micro_story',
    name: 'Specific Micro-Story & Curhat Relate',
    description: 'Cerita skenario kehidupan nyata (nugas malam, meeting klien, kuota mepet, dll)',
    hookHint: 'Pernah gak lagi asik ... tiba-tiba ...? Rasanya pengen ...',
  },
  {
    id: 'price_breakdown',
    name: 'Value Breakdown & Coffee Comparison',
    description: 'Bandingkan biaya langganan dengan pengeluaran remeh harian (segelas kopi/rokok)',
    hookHint: 'Harga 1 gelas kopi kekinian vs langganan pro sebulan penuh...',
  },
  {
    id: 'productivity_hack',
    name: 'Productivity & Workflow Hack',
    description: 'Trik hemat waktu berjam-jam untuk kerjaan atau tugas sehari-hari',
    hookHint: 'Trik rahasia beresin kerjaan 3x lebih cepet tanpa pusing...',
  },
  {
    id: 'fomo_urgency',
    name: 'FOMO & Limited Slot Restock',
    description: 'Urgensi ketersediaan akun resmi yang sering rebutan',
    hookHint: 'Akhirnya restock juga hari ini! Cuma buka slot terbatas...',
  },
  {
    id: 'mistakes_to_avoid',
    name: 'Mistakes to Avoid & Red Flags',
    description: 'Edukasi bahaya beli akun ilegal/mod/apk abal-abal vs legal bergaransi',
    hookHint: 'Jangan sampai kejebak akun murah tapi tiap 3 hari ke-ban...',
  },
  {
    id: 'secret_features',
    name: 'Secret Pro Features',
    description: 'Eksplorasi fitur tersembunyi yang jarang dimaksimalkan pengguna',
    hookHint: 'Fitur tersembunyi di ... yang bikin workflow kamu naik kelas:',
  },
  {
    id: 'organic_tips',
    name: 'Edukasi & Tips Digital Organik',
    description: 'Konten non-produk bernilai tinggi untuk menaikkan engagement & follower',
    hookHint: '5 tools/shortcut gratis yang wajib ada di laptop kamu di 2026...',
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
  angle?: string | null;
  customTopic?: string | null;
  targetAudience?: string | null;
}

export interface GenerationResult {
  title: string;
  hookAngle: string;
  posts: Array<{ orderIndex: number; content: string; mediaUrl?: string | null }>;
  metadata?: Record<string, any>;
}

/**
 * Builds the AI generation prompt with strict anti-cliche and humanizer rules
 */
export function buildGenerationPrompt(input: GenerationInput): string {
  const { product, store, angle, customTopic, targetAudience } = input;
  const storeName = store?.name || 'Toko Digital ID';
  const storeHandle = store?.username || 'tokodigital.id';

  const selectedAngleObj = GENERATION_ANGLES.find((a) => a.id === angle || a.name === angle) || GENERATION_ANGLES[0];
  const angleName = selectedAngleObj?.name || 'Storytelling & Relate';
  const hookHint = selectedAngleObj?.hookHint || '';

  let contextDescription = '';
  if (product) {
    const variantsStr = product.variants?.length
      ? product.variants.map((v) => `• ${v.name}: Rp ${v.price.toLocaleString('id-ID')}${v.duration ? ` (${v.duration})` : ''}`).join('\n')
      : '• Harga hemat terjangkau';
    const uspsStr = product.usp?.length
      ? product.usp.map((u) => `✅ ${u}`).join('\n')
      : '✅ Full garansi replace\n✅ Proses instan hitungan menit';

    contextDescription = `
PRODUK YANG AKAN DIPROMOSIKAN:
- Nama Produk: ${product.name}
- Kategori: ${product.category || 'Digital Service'}
- Target Audiens Spesifik: ${targetAudience || product.targetAudience || 'Mahasiswa, Pekerja Kreatif, Freelancer'}
- Varian & Harga Resmi:
${variantsStr}
- Keunggulan Utama (USP):
${uspsStr}
- Call to Action Template: ${product.ctaTemplate || `Langsung DM @${storeHandle} buat order sekarang!`}
`.trim();
  } else {
    contextDescription = `
KONTEN ORGANIK / EDUKASI / ENGAGEMENT (TANPA PRODUK JUALAN LANGSUNG):
- Topik / Fokus: ${customTopic || 'Tips produktivitas kerja digital, tools AI, atau tips freelance 2026'}
- Target Audiens: ${targetAudience || 'Pengguna Threads aktif, kreator, profesional muda'}
- Tujuan: Memberikan insight bernilai tinggi, memancing replies/repost, dan soft-follow ke @${storeHandle}.
`.trim();
  }

  return `
PANDUAN PEMBUATAN KONTEN THREADS (META):
Kamu adalah Hermes AI Copywriting Agent yang ahli membuat konten viral, segar, dan berkonversi tinggi di platform Threads.
Gunakan standar copywriting "ecommerce-copy-humanizer-id".

INFORMASI BISNIS:
- Toko: ${storeName} (@${storeHandle})
${contextDescription}

SUDUT PANDANG / ANGLE KONTEN:
- Angle: ${angleName}
- Inspirasi Hook: "${hookHint}"
${customTopic ? `- Topik Tambahan dari Pengguna: "${customTopic}"` : ''}

ATURAN ANTI-KLISE & ANTI-GENERIC (SANGAT PENTING):
1. JANGAN gunakan pembuka klise seperti "Lagi asik nugas..." atau formula robotik yang kaku. Ciptakan skenario spesifik dan segar!
2. Bahasa Indonesia santai, luwes, dan natural (e.g. gess, sat-set, boncos, worth it, nugas, gak pake ribet, cuan).
3. Struktur 3 Post Thread:
   - Post 1 (Hook): Masalah relatable / pertanyaan / kontrarian yang memicu rasa penasaran + diakhiri "🧵👇".
   - Post 2 (Value / Proof): Solusi nyata, breakdown keunggulan, daftar harga / tips konkret.
   - Post 3 (Call to Action): CTA ajakan diskusi / order mengarah ke bio @${storeHandle}.
4. Setiap post HARUS DI BAWAH 500 KARAKTER (Batas Threads).

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON BERIKUT (TANPA MARKDOWN FENCES / TEXT LAIN):
{
  "title": "Judul Draft yang Menarik & Singkat",
  "hookAngle": "${angleName}",
  "posts": [
    { "orderIndex": 0, "content": "Teks post 1 (Hook)... 🧵👇" },
    { "orderIndex": 1, "content": "Teks post 2 (Value & Benefit)..." },
    { "orderIndex": 2, "content": "Teks post 3 (Action & CTA ke @${storeHandle})..." }
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
        hookAngle: String(obj.hookAngle || 'Storytelling & Relate'),
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
 */
export async function generateDraftWithHermes(input: GenerationInput): Promise<GenerationResult> {
  const prompt = buildGenerationPrompt(input);

  try {
    const rawResponse = await callHermesChatCompletion(prompt);
    const parsed = parseHermesGenerationResponse(rawResponse);
    if (parsed) {
      return parsed;
    }
  } catch (err: any) {
    console.warn('Hermes AI generation failed, using dynamic fallback:', err?.message || err);
  }

  // Fallback dynamic generator if AI is temporarily unreachable
  const storeHandle = input.store?.username || 'tokodigital.id';
  const prodName = input.product?.name || 'layanan digital';
  const selectedAngle = GENERATION_ANGLES.find((a) => a.id === input.angle) || GENERATION_ANGLES[0];

  return {
    title: `[${selectedAngle.name.split('/')[0].trim()}] ${prodName}`,
    hookAngle: selectedAngle.name,
    posts: [
      {
        orderIndex: 0,
        content: `Banyak yang belum sadar kalau langganan ${prodName} resmi itu sekarang bisa hemat banget tanpa boncos! 💡\n\nNih insight yang wajib kamu tahu 🧵👇`,
      },
      {
        orderIndex: 1,
        content: `Keuntungan yang kamu dapetin:\n${(input.product?.usp || ['100% Legal & Bergaransi', 'Aktivasi Instan']).slice(0, 3).map((u) => `✅ ${u}`).join('\n')}\n\nProses sat-set tanpa VPN, langsung siap pakai buat harian.`,
      },
      {
        orderIndex: 2,
        content: `Yuk upgrade sekarang mumpung slot promo masih ready!\n\n👉 Cek info lengkap & order via bio @${storeHandle} ya gess! 🚀`,
      },
    ],
    metadata: {
      generatedBy: 'hermes-fallback-engine',
      generatedAt: new Date().toISOString(),
    },
  };
}
