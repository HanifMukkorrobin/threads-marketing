/**
 * AI Revision Engine
 * Powered by Hermes AI Agent (ag/gemini-3.6-flash-high)
 * Adheres to /ecommerce-copy-humanizer-id
 * Enables human-in-the-loop interactive feedback & real-time re-generation
 */

import {
  buildRevisionPrompt,
  callHermesChatCompletion,
  parseHermesJsonResponse,
} from './hermes-client';

export interface RevisionInput {
  posts: Array<{ orderIndex: number; content: string; mediaUrl?: string | null }>;
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
  instruction: string;
  targetPartIndex?: number | null;
}

export interface RevisionResult {
  posts: Array<{ orderIndex: number; content: string; mediaUrl?: string | null }>;
  explanation: string;
  revisedPartIndex?: number | null;
}

/**
 * Detects if a user instruction specifies a particular thread part (e.g. "post 3", "bagian 1", "hook", "cta")
 */
export function detectTargetPostIndex(instruction: string): number | null {
  const lower = instruction.toLowerCase().trim();

  // Explicit post numbers
  const postNumMatch = lower.match(/(?:post|bagian|slide|tweet|paragraf)\s*(\d+)/i);
  if (postNumMatch && postNumMatch[1]) {
    const num = parseInt(postNumMatch[1], 10);
    return Math.max(0, num - 1);
  }

  // Named sections
  if (lower.includes('hook') || lower.includes('pertama') || lower.includes('awal') || lower.includes('judul')) {
    return 0;
  }

  if (lower.includes('cta') || lower.includes('call to action') || lower.includes('terakhir') || lower.includes('penutup')) {
    return 2; // Default 3rd post is CTA
  }

  if (lower.includes('benefit') || lower.includes('harga') || lower.includes('keunggulan') || lower.includes('kedua')) {
    return 1;
  }

  return null;
}

/**
 * Heuristic fallback generator in case Hermes Agent AI is temporarily unreachable
 */
export function reviseDraftContentHeuristic(input: RevisionInput): RevisionResult {
  const { posts, product, store, instruction } = input;
  const targetIndex = input.targetPartIndex !== undefined && input.targetPartIndex !== null
    ? input.targetPartIndex
    : detectTargetPostIndex(instruction);

  const cleanInstruction = instruction.trim();
  const nextPosts = posts.map((p) => ({ ...p }));
  const prodName = product?.name || 'layanan';
  const audience = product?.targetAudience ? `buat ${product.targetAudience.toLowerCase()}` : 'buat harian';
  const usps = product?.usp && product.usp.length > 0 ? product.usp : ['100% legal & bergaransi', 'Proses instan hitungan menit'];
  const storeHandle = store?.username || 'tokodigital.id';
  const storeName = store?.name || 'Toko Digital ID';
  const cta = product?.ctaTemplate || `Yuk amankan slot promo kamu sekarang, langsung DM @${storeHandle} atau cek link di bio ya! 🚀`;

  // CASE 1: Targeted single-post revision
  if (targetIndex !== null && targetIndex >= 0 && targetIndex < posts.length) {
    const currentPost = nextPosts[targetIndex];
    let newContent = currentPost.content;

    const directMatch = cleanInstruction.match(/(?:menjadi|jadi|isi dengan|ganti teks)\s*[:"“']*(.+?)["”']*$/i);
    if (directMatch && directMatch[1] && directMatch[1].trim().length > 5) {
      newContent = directMatch[1].trim();
    } else if (cleanInstruction.toLowerCase().includes('cta') || targetIndex === 2) {
      if (cleanInstruction.toLowerCase().includes('urgensi') || cleanInstruction.toLowerCase().includes('fomo') || cleanInstruction.toLowerCase().includes('terbatas')) {
        newContent = `⚡️ Slot promo ${prodName} sangat terbatas hari ini gess.\n\n👉 Langsung DM @${storeHandle} atau klik link di bio sebelum kehabisan! 🔥`;
      } else if (cleanInstruction.toLowerCase().includes('garansi') || cleanInstruction.toLowerCase().includes('aman')) {
        newContent = `🛡️ Full garansi replace & anti banned. Admin siap bantu aktivasi 24/7.\n\n🚀 Order instan via link di bio @${storeHandle}!`;
      } else if (cleanInstruction.toLowerCase().includes('santai') || cleanInstruction.toLowerCase().includes('kasual')) {
        newContent = `Gak usah mikir kelamaan gess, langsung cobain sendiri feel-nya.\n\nDM @${storeHandle} sekarang buat info promo ready! ✨`;
      } else {
        newContent = `${cta}\n\n(Revisi: ${cleanInstruction.slice(0, 100)})`;
      }
    } else if (cleanInstruction.toLowerCase().includes('hook') || targetIndex === 0) {
      if (cleanInstruction.toLowerCase().includes('pertanyaan') || cleanInstruction.toLowerCase().includes('tanya')) {
        newContent = `Pernah ngerasa nyesel karena telat tau cara langganan ${prodName} semurah ini? 🤔\n\nNih trik rahasia hematnya 🧵👇`;
      } else if (cleanInstruction.toLowerCase().includes('fomo') || cleanInstruction.toLowerCase().includes('urgent')) {
        newContent = `🔥 JANGAN SAMPAI KELEWATAN: Akses promo khusus ${prodName} cuma dibuka untuk minggu ini!\n\nSimak detailnya 🧵👇`;
      } else if (cleanInstruction.toLowerCase().includes('relate') || cleanInstruction.toLowerCase().includes('curhat')) {
        newContent = `Niatnya mau produktif nugas atau dengerin musik santai, tapi malah kepotong iklan tiada henti 😤\n\nYuk beralih ke ${prodName} sekarang 🧵👇`;
      } else {
        newContent = `✨ Rahasia upgrade ${prodName} resmi & bergaransi tanpa bikin kantong jebol.\n\nSimak penjelasannya 🧵👇`;
      }
    } else {
      newContent = `Benefit utama yang wajib kamu tahu:\n${usps.slice(0, 4).map((u) => `✅ ${u}`).join('\n')}\n\nProses aktivasi hitungan menit tanpa ribet setup VPN!`;
    }

    if (newContent.length > 490) {
      newContent = newContent.slice(0, 485) + '...';
    }

    nextPosts[targetIndex] = {
      ...currentPost,
      content: newContent,
    };

    return {
      posts: nextPosts,
      revisedPartIndex: targetIndex,
      explanation: `Bagian Post ${targetIndex + 1} berhasil direvisi sesuai instruksi: "${cleanInstruction}".`,
    };
  }

  // CASE 2: Whole-thread tone / content revision
  const lowerInstr = cleanInstruction.toLowerCase();
  let revisedChain = [];

  if (lowerInstr.includes('fomo') || lowerInstr.includes('promo') || lowerInstr.includes('terbatas')) {
    revisedChain = [
      {
        orderIndex: 0,
        content: `🚨 ALERT PROMO SPESIAL: Slot akun ${prodName} resmi dibuka lagi hari ini dengan kuota terbatas! 🔥\n\nBiar gak kehabisan lagi kayak kemarin, baca thread ini sampai habis 🧵👇`,
      },
      {
        orderIndex: 1,
        content: `Keunggulan & benefit yang kamu dapet:\n${usps.slice(0, 4).map((u) => `✅ ${u}`).join('\n')}\n\nPilihan varian mulai harga hemat!\nCocok banget ${audience} yang pengen hemat pengeluaran bulanan.`,
      },
      {
        orderIndex: 2,
        content: `⚡️ Kuota promo sangat terbatas hari ini.\n\n${cta}`,
      },
    ];
  } else if (lowerInstr.includes('singkat') || lowerInstr.includes('to the point') || lowerInstr.includes('pendek')) {
    revisedChain = [
      {
        orderIndex: 0,
        content: `Mau langganan ${prodName} legal & anti ribet? Nih info lengkapnya 🧵👇`,
      },
      {
        orderIndex: 1,
        content: `Kelebihan:\n${usps.slice(0, 3).map((u) => `• ${u}`).join('\n')}\n\n100% bergaransi & proses instan.`,
      },
      {
        orderIndex: 2,
        content: `${cta}`,
      },
    ];
  } else {
    revisedChain = [
      {
        orderIndex: 0,
        content: `Lagi asik nugas atau kerja tapi terganggu batasan akun? 😤\n\nNih solusi cerdas langganan ${prodName} legal, murah, dan full garansi tanpa ribet 🧵👇`,
      },
      {
        orderIndex: 1,
        content: `Kenapa harus order di ${storeName}?\n${usps.slice(0, 4).map((u) => `✅ ${u}`).join('\n')}\n\nAkun langsung aktif hitungan menit, no VPN & bergaransi penuh!`,
      },
      {
        orderIndex: 2,
        content: `${cta}`,
      },
    ];
  }

  return {
    posts: revisedChain.map((p, idx) => ({
      ...p,
      mediaUrl: posts[idx]?.mediaUrl || null,
    })),
    revisedPartIndex: null,
    explanation: `Seluruh alur thread berhasil diregenerasi dengan gaya baru sesuai instruksi: "${cleanInstruction}".`,
  };
}

/**
 * Executes draft revision logic powered by Hermes AI Agent (asynchronous)
 */
export async function reviseDraftContent(input: RevisionInput): Promise<RevisionResult> {
  const targetIndex = input.targetPartIndex !== undefined && input.targetPartIndex !== null
    ? input.targetPartIndex
    : detectTargetPostIndex(input.instruction);

  const enhancedInput: RevisionInput = {
    ...input,
    targetPartIndex: targetIndex,
  };

  try {
    const prompt = buildRevisionPrompt(enhancedInput);
    const rawResponse = await callHermesChatCompletion(prompt);
    const parsed = parseHermesJsonResponse(rawResponse);

    if (parsed && Array.isArray(parsed.posts) && parsed.posts.length > 0) {
      return {
        posts: parsed.posts.map((p, idx) => ({
          orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : idx,
          content: p.content,
          mediaUrl: input.posts[idx]?.mediaUrl || null,
        })),
        revisedPartIndex: parsed.revisedPartIndex !== undefined ? parsed.revisedPartIndex : targetIndex,
        explanation: parsed.explanation || `Revisi berhasil diproses oleh Hermes Agent: "${input.instruction.slice(0, 80)}"`,
      };
    }
  } catch (err: any) {
    console.warn('Hermes Agent AI revision call failed, using heuristic fallback:', err?.message || err);
  }

  return reviseDraftContentHeuristic(enhancedInput);
}
