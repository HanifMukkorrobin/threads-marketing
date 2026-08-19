import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { RevisionInput, RevisionResult } from './revision-engine';

const execFileAsync = promisify(execFile);

export interface HermesConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

let cachedApiKey: string | null = null;

/**
 * Resolves Hermes API configuration from environment, ~/.hermes/.env, or defaults
 */
export function getHermesConfig(): HermesConfig {
  let apiKey =
    process.env.HERMES_AI_API_KEY ||
    process.env.HERMES_CUSTOM_168_110_198_40_20128_API_KEY ||
    cachedApiKey ||
    '';

  if (!apiKey) {
    try {
      const hermesEnvPath = path.join(os.homedir(), '.hermes', '.env');
      if (fs.existsSync(hermesEnvPath)) {
        const content = fs.readFileSync(hermesEnvPath, 'utf8');
        const match = content.match(/HERMES_CUSTOM_168_110_198_40_20128_API_KEY=["']?([^"'\r\n]+)["']?/);
        if (match && match[1]) {
          apiKey = match[1].trim();
          cachedApiKey = apiKey;
        }
      }
    } catch {
      // Fallback silently if file read fails
    }
  }

  return {
    baseUrl: process.env.HERMES_AI_BASE_URL || 'http://168.110.198.40:20128/v1',
    apiKey: apiKey || '',
    model: process.env.HERMES_AI_MODEL || 'ag/gemini-3.6-flash-high',
  };
}

export interface HermesRevisionOutput {
  posts: Array<{ orderIndex: number; content: string; mediaUrl?: string | null }>;
  revisedPartIndex?: number | null;
  explanation: string;
}

/**
 * Cleans and parses JSON output from Hermes Agent response
 */
export function parseHermesJsonResponse(rawText: string): HermesRevisionOutput | null {
  if (!rawText || typeof rawText !== 'string') return null;

  let cleaned = rawText.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ...)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Try parsing directly
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.posts)) {
      return {
        posts: parsed.posts.map((p: any, idx: number) => ({
          orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : idx,
          content: String(p.content || '').slice(0, 500),
          mediaUrl: p.mediaUrl || null,
        })),
        revisedPartIndex: typeof parsed.revisedPartIndex === 'number' ? parsed.revisedPartIndex : null,
        explanation: String(parsed.explanation || 'Revisi berhasil diproses oleh Hermes Agent.'),
      };
    }
  } catch {
    // If wrapped in extraneous text, extract between first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonSubstring);
        if (parsed && Array.isArray(parsed.posts)) {
          return {
            posts: parsed.posts.map((p: any, idx: number) => ({
              orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : idx,
              content: String(p.content || '').slice(0, 500),
              mediaUrl: p.mediaUrl || null,
            })),
            revisedPartIndex: typeof parsed.revisedPartIndex === 'number' ? parsed.revisedPartIndex : null,
            explanation: String(parsed.explanation || 'Revisi berhasil diproses oleh Hermes Agent.'),
          };
        }
      } catch {
        // Fallback
      }
    }
  }

  return null;
}

/**
 * Builds the copywriting prompt with full product and store context
 */
export function buildRevisionPrompt(input: RevisionInput): string {
  const { posts, product, store, instruction, targetPartIndex } = input;

  const currentPostsStr = posts
    .map((p, idx) => `[Post ${idx + 1} (orderIndex: ${p.orderIndex})]:\n${p.content}`)
    .join('\n\n');

  let productDetails = 'TIDAK ADA PRODUK KHUSUS (Konten Organik / Edukasi / Tech Insights)';
  if (product) {
    const variantsStr = product.variants?.length
      ? product.variants.map((v) => `- ${v.name}: Rp ${v.price.toLocaleString('id-ID')}${v.duration ? ` (${v.duration})` : ''}`).join('\n')
      : '-';
    const uspsStr = product.usp?.length ? product.usp.map((u) => `✅ ${u}`).join('\n') : '-';

    productDetails = `
- Nama Produk: ${product.name || '-'}
- Kategori: ${product.category || '-'}
- Target Audiens: ${product.targetAudience || 'Umum / Mahasiswa / Pekerja'}
- Varian & Harga:
${variantsStr}
- Keunggulan (USP):
${uspsStr}
- CTA Template Bawaan: ${product.ctaTemplate || '-'}
`.trim();
  }

  const storeDetails = `
- Nama Toko: ${store?.name || 'Toko Digital ID'}
- Username/Handle Threads: @${store?.username || 'tokodigital.id'}
`.trim();

  let targetPartText = 'Bebas / Seluruh Thread jika diperlukan';
  if (typeof targetPartIndex === 'number' && targetPartIndex >= 0) {
    targetPartText = `Post ${targetPartIndex + 1} (orderIndex: ${targetPartIndex})`;
  }

  const personaGuidance = product
    ? `Persona: Digital Specialist & Solution Consultant. Gunakan bahasa Indonesia yang natural, lugas, profesional, dan meyakinkan tanpa gaya jualan murahan atau slang berlebihan.`
    : `Persona: Senior Tech Practitioner & Systems Architect. Gunakan bahasa Indonesia yang berbobot, berbasis insight teknis nyata/praktis, lugas, dan zero jargon/slang murahan.`;

  return `
KONTEN DRAFT THREADS SAAT INI:
${currentPostsStr}

INFORMASI PRODUK:
${productDetails}

PROFIL TOKO:
${storeDetails}

TARGET BAGIAN YANG DIINGINKAN:
${targetPartText}

INSTRUKSI REVISI DARI PENGGUNA:
"${instruction.trim()}"

TUGAS KAMU:
Revisi thread di atas sesuai instruksi pengguna dengan panduan persona berikut:
${personaGuidance}
1. Gunakan bahasa Indonesia yang mengalir natural, tidak kaku (terjemahan mesin), dan bebas dari slang norak/klise yang dipaksakan.
2. Setiap post TIDAK BOLEH lebih dari 500 karakter.
3. Pertahankan link atau placeholder penting, serta pastikan CTA mengarah ke @${store?.username || 'tokodigital.id'}.
4. Jika instruksi hanya meminta revisi pada 1 post (misal Post 3 atau Hook), jangan ubah post lainnya secara drastis kecuali diminta merombak seluruh gaya thread.

KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON BERIKUT (TANPA TEKS LAIN):
{
  "posts": [
    { "orderIndex": 0, "content": "..." },
    { "orderIndex": 1, "content": "..." },
    { "orderIndex": 2, "content": "..." }
  ],
  "revisedPartIndex": ${typeof targetPartIndex === 'number' ? targetPartIndex : 'null'},
  "explanation": "Penjelasan singkat dalam 1-2 kalimat bahasa Indonesia apa saja yang diubah."
}
`.trim();
}

export const HERMES_TECH_PRACTITIONER_SYSTEM_PROMPT = `
You are a Senior Software & AI Systems Architect and hands-on Tech Practitioner.
You write insightful, authentic, high-signal engineering and AI content for Threads.

CORE DIRECTIVES:
1. Tone & Persona: Senior tech practitioner, systems thinker, pragmatic, direct, and intellectually honest.
2. Focus on concrete architectural tradeoffs, real-world mechanics, failure modes, benchmarks, and actionable workflows.
3. Strict anti-cliche: NO cringe marketing slang (do not use "gess", "sat-set", "boncos", "nugas", "kantong jebol", "anti-ribet").
4. Character Limit: Every single post MUST be strictly UNDER 500 characters.
5. Thread Structure:
   - Post 1: High-signal hook stating a concrete technical premise, counter-intuitive insight, or hard problem + "🧵👇".
   - Post 2+: Technical breakdown, concrete implementation steps, architecture patterns, or code/tool flows.
   - Final Post: Pragmatic takeaways, open technical discussion question, or clean call to action.
6. Output MUST be ONLY valid JSON matching the requested schema. No conversational filler before or after the JSON.
`.trim();

export const HERMES_COMMERCIAL_PROMO_SYSTEM_PROMPT = `
You are a Digital Specialist & Solution Consultant writing clear, high-converting product showcases for Threads.

CORE DIRECTIVES:
1. Tone & Persona: Professional, honest, direct, value-driven, and consultative.
2. Focus on clear value propositions, transparent pricing, genuine workflow benefits, and official warranty/guarantees.
3. Strict anti-cringe: NO cheap marketing hype or forced cheesy slang. Sound like a trusted digital consultant.
4. Character Limit: Every single post MUST be strictly UNDER 500 characters.
5. Thread Structure:
   - Post 1: Problem-focused hook addressing a real workflow bottleneck or productivity need + "🧵👇".
   - Post 2: Product solution, key features, pricing packages, and warranty transparency.
   - Post 3: Actionable CTA directing user to order or DM via official handle.
6. Output MUST be ONLY valid JSON matching the requested schema. No conversational filler before or after the JSON.
`.trim();

export const HERMES_SYSTEM_PROMPT = HERMES_TECH_PRACTITIONER_SYSTEM_PROMPT;

/**
 * Calls Hermes Agent AI using direct OpenAI-compatible HTTP endpoint with CLI fallback
 */
export async function callHermesChatCompletion(
  prompt: string,
  systemPrompt: string = HERMES_TECH_PRACTITIONER_SYSTEM_PROMPT
): Promise<string> {
  const config = getHermesConfig();

  // Try HTTP endpoint first if API key is present
  if (config.apiKey && config.baseUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          stream: false,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;
        if (content && typeof content === 'string') {
          return content.trim();
        }
      }
    } catch (httpError) {
      clearTimeout(timer);
      console.warn('HTTP Hermes call failed, falling back to CLI:', httpError);
    }
  }

  // Fallback to Hermes CLI one-shot execution (`hermes -z`)
  try {
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;
    const { stdout } = await execFileAsync('hermes', ['-z', fullPrompt], {
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 5,
    });
    if (stdout && stdout.trim()) {
      return stdout.trim();
    }
  } catch (cliError: any) {
    console.error('Hermes CLI execution error:', cliError?.message || cliError);
  }

  throw new Error('Hermes Agent tidak dapat dihubungi via API maupun CLI.');
}
