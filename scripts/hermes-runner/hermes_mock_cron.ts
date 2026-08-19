#!/usr/bin/env node
/**
 * Hermes Agent Autonomous Cron Runner (TypeScript / Node.js)
 * 
 * Simulates Hermes AI generating high-converting thread drafts for active products
 * and publishing approved drafts to Threads.
 * 
 * Usage:
 *   npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=generate
 *   npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=post
 *   npx tsx scripts/hermes-runner/hermes_mock_cron.ts --action=all
 */

import fs from 'fs';
import path from 'path';
import { selectLRUProduct, selectRotatedAngle } from '../../src/lib/rotation-engine';
import { generateDraftWithHermes, GENERATION_ANGLES } from '../../src/lib/generation-engine';
import { loadAllKnowledgeTopics, selectLRUKnowledgeTopic, KnowledgeTopic } from '../../src/lib/knowledge-wiki';

// Lightweight zero-dependency env loader for CLI standalone execution
function loadLocalEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}
loadLocalEnv();

export interface RunnerOptions {
  baseUrl?: string;
  apiKey?: string;
  action?: 'generate' | 'post' | 'all';
  threadsAccessToken?: string;
  threadsUserId?: string;
}

export interface HermesProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  variants: Array<{ name: string; price: number; duration?: string }>;
  usp: string[];
  targetAudience?: string | null;
  toneOfVoice?: string | null;
  ctaTemplate?: string | null;
}

export interface HermesDraftItem {
  id: string;
  title: string;
  status: string;
  type: string;
  hookAngle?: string;
  posts: Array<{ orderIndex: number; content: string; mediaUrl?: string | null }>;
}

async function publishDraftToThreadsGraphApi(
  draft: HermesDraftItem,
  accessToken: string,
  userId: string,
  storeUsername: string
): Promise<{ threadPostId: string; threadPostUrl: string }> {
  let targetUserId = userId;
  if (!targetUserId) {
    try {
      const meRes = await fetch(
        `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`
      );
      if (meRes.ok) {
        const meData = await meRes.json();
        targetUserId = meData.id || 'me';
        if (meData.username) storeUsername = meData.username;
      } else {
        targetUserId = 'me';
      }
    } catch {
      targetUserId = 'me';
    }
  }

  const posts = [...(draft.posts || [])].sort((a, b) => a.orderIndex - b.orderIndex);
  if (posts.length === 0) {
    posts.push({ orderIndex: 0, content: draft.title });
  }

  let rootPostId = '';
  let lastPostId = '';

  for (let i = 0; i < posts.length; i++) {
    const postItem = posts[i];
    console.log(`   [Post ${i + 1}/${posts.length}] Mengunggah ke Meta Threads container...`);

    // 1. Create Media Container
    const containerParams = new URLSearchParams();
    containerParams.append('media_type', 'TEXT');
    containerParams.append('text', postItem.content);
    containerParams.append('access_token', accessToken);

    if (i > 0 && lastPostId) {
      containerParams.append('reply_to_id', lastPostId);
    }

    const containerRes = await fetch(
      `https://graph.threads.net/v1.0/${targetUserId}/threads?${containerParams.toString()}`,
      { method: 'POST' }
    );

    if (!containerRes.ok) {
      const errJson = await containerRes.json().catch(() => ({}));
      const errMsg = errJson.error?.message || errJson.error || `HTTP ${containerRes.status} ${containerRes.statusText}`;
      throw new Error(`Threads Container Creation Error (Post ${i + 1}): ${errMsg}`);
    }

    const containerData = await containerRes.json();
    const creationId = containerData.id;
    if (!creationId) {
      throw new Error(`No creation ID returned from Threads API: ${JSON.stringify(containerData)}`);
    }

    // 2. Poll container status until FINISHED
    for (let attempt = 0; attempt < 15; attempt++) {
      const statusParams = new URLSearchParams({
        fields: 'status,error_message',
        access_token: accessToken,
      });
      const statusRes = await fetch(
        `https://graph.threads.net/v1.0/${creationId}?${statusParams.toString()}`
      );
      if (statusRes.ok) {
        const sData = await statusRes.json();
        if (sData.status === 'FINISHED') {
          break;
        } else if (sData.status === 'ERROR') {
          throw new Error(`Threads Container Error (Post ${i + 1}): ${sData.error_message || 'Processing failed'}`);
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // 3. Publish Container
    const publishParams = new URLSearchParams();
    publishParams.append('creation_id', creationId);
    publishParams.append('access_token', accessToken);

    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${targetUserId}/threads_publish?${publishParams.toString()}`,
      { method: 'POST' }
    );

    if (!publishRes.ok) {
      const errJson = await publishRes.json().catch(() => ({}));
      const errMsg = errJson.error?.message || errJson.error || `HTTP ${publishRes.status} ${publishRes.statusText}`;
      throw new Error(`Threads Publish Error (Post ${i + 1}): ${errMsg}`);
    }

    const publishData = await publishRes.json();
    const publishedId = publishData.id;
    if (!publishedId) {
      throw new Error(`No published ID returned from Threads API: ${JSON.stringify(publishData)}`);
    }

    if (i === 0) {
      rootPostId = publishedId;
    }
    lastPostId = publishedId;

    if (i < posts.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // 3. Retrieve Permalink
  let permalink = `https://www.threads.net/@${storeUsername}/post/${rootPostId}`;
  try {
    const permalinkRes = await fetch(
      `https://graph.threads.net/v1.0/${rootPostId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`
    );
    if (permalinkRes.ok) {
      const permalinkData = await permalinkRes.json();
      if (permalinkData.permalink) {
        permalink = permalinkData.permalink;
      }
    }
  } catch {
    // fallback to constructed permalink
  }

  return { threadPostId: rootPostId, threadPostUrl: permalink };
}

function formatPrice(val: number): string {
  return `Rp ${val.toLocaleString('id-ID')}`;
}

function getPricePreview(p: HermesProduct): string {
  if (!p.variants || p.variants.length === 0) return 'harga hemat';
  const lowest = Math.min(...p.variants.map((v) => v.price || 0));
  return `mulai ${formatPrice(lowest)}`;
}

function getVariantListText(p: HermesProduct): string {
  if (!p.variants || p.variants.length === 0) return '';
  return p.variants
    .slice(0, 3)
    .map((v) => `• ${v.name}: ${formatPrice(v.price)}${v.duration ? ` (${v.duration})` : ''}`)
    .join('\n');
}

function getUspBulletList(p: HermesProduct): string {
  if (!p.usp || p.usp.length === 0) return '• Full garansi & proses instan';
  return p.usp.slice(0, 4).map((u) => `✅ ${u}`).join('\n');
}

export interface HermesStoreInfo {
  name: string;
  username: string;
  avatarUrl?: string;
}

// Commercial Promo Hook Archetypes (Clean, Professional, and Value-Driven)
export const HUMANIZED_HOOK_ARCHETYPES = [
  {
    angle: 'Storytelling & Real Case',
    generate: (p: HermesProduct, store?: HermesStoreInfo) => {
      const audience = p.targetAudience ? `buat ${p.targetAudience.toLowerCase()}` : 'buat harian';
      const cta = p.ctaTemplate || `Yuk amankan slot promo kamu sekarang, langsung DM @${store?.username || 'tokodigital.id'} atau cek link di bio ya! 🚀`;
      const storeName = store?.name || 'Toko Digital ID';

      return {
        title: `[Kasus Nyata] Efisiensi Biaya ${p.name} untuk Workflow Harian`,
        posts: [
          {
            orderIndex: 0,
            content: `Sering mengalami limit akun atau kendala akses saat mengejar deadline penting? 💡\n\nAda cara berlangganan ${p.name} resmi dan bergaransi dengan biaya terjangkau (${getPricePreview(p)}). Simak pembahasannya di bawah 🧵👇`,
          },
          {
            orderIndex: 1,
            content: `Keunggulan layanan di ${storeName}:\n${getUspBulletList(p)}\n\nPilihan paket tersedia:\n${getVariantListText(p)}\n\nDirancang untuk ${audience} yang membutuhkan stabilitas akun tanpa kendala teknis.`,
          },
          {
            orderIndex: 2,
            content: `Proses aktivasi langsung dan transparan tanpa perlu setup rumit.\n\n${cta}`,
          },
        ],
      };
    },
  },
  {
    angle: 'Solusi Cerdas & Efisiensi Biaya',
    generate: (p: HermesProduct, store?: HermesStoreInfo) => {
      const handle = store?.username || 'tokodigital.id';
      const cta = p.ctaTemplate || 'Stok slot terbatas, amankan sekarang sebelum kehabisan!';

      return {
        title: `[Efisiensi] Optimasi Biaya Berlangganan ${p.name}`,
        posts: [
          {
            orderIndex: 0,
            content: `Memaksimalkan anggaran digital bulanan bisa dimulai dari memilih paket langganan ${p.name} yang tepat dan bergaransi 💡\n\nBerikut perbandingan nilai dan opsi paket resmi 🧵👇`,
          },
          {
            orderIndex: 1,
            content: `Benefit utama:\n${getUspBulletList(p)}\n\n💰 Varian paket resmi:\n${getVariantListText(p)}\n\nSetiap paket mencakup garansi replace dan bantuan teknis.`,
          },
          {
            orderIndex: 2,
            content: `Optimalkan workflow digital Anda hari ini.\n\n👉 ${cta} (Detail pemesanan resmi tersedia di bio profil @${handle})`,
          },
        ],
      };
    },
  },
  {
    angle: 'Productivity & Feature Optimization',
    generate: (p: HermesProduct, store?: HermesStoreInfo) => {
      const cta = p.ctaTemplate || `Langsung order via link di bio @${store?.username || 'tokodigital.id'} untuk aktivasi instan!`;

      return {
        title: `[Optimasi] Maksimalkan Fitur Pro ${p.name}`,
        posts: [
          {
            orderIndex: 0,
            content: `Memanfaatkan fitur pro pada ${p.name} secara optimal dapat meningkatkan kecepatan eksekusi kerja secara signifikan ⚡️\n\nTips integrasi fitur ke dalam workflow harian 🧵👇`,
          },
          {
            orderIndex: 1,
            content: `Kenapa memilih layanan kami?\n${getUspBulletList(p)}\n\nKatalog paket tersedia (${getPricePreview(p)}):\n${getVariantListText(p)}`,
          },
          {
            orderIndex: 2,
            content: `Tingkatkan produktivitas kerja dengan akun resmi bergaransi.\n\n⚡️ ${cta}`,
          },
        ],
      };
    },
  },
  {
    angle: 'Slot & Kuota Promo Terbatas',
    generate: (p: HermesProduct, store?: HermesStoreInfo) => {
      const cta = p.ctaTemplate || 'Slot kuota terbatas, langsung amankan sebelum periode promo berakhir!';

      return {
        title: `[Informasi] Alokasi Paket Khusus ${p.name}`,
        posts: [
          {
            orderIndex: 0,
            content: `Alokasi paket khusus ${p.name} kini kembali tersedia dengan kuota terbatas untuk periode ini 📌\n\nPastikan akun kerja Anda tetap aktif dan stabil 🧵👇`,
          },
          {
            orderIndex: 1,
            content: `Jaminan layanan:\n${getUspBulletList(p)}\n\n📦 Paket yang tersedia:\n${getVariantListText(p)}`,
          },
          {
            orderIndex: 2,
            content: `Aktivasi cepat dan dipandu hingga siap digunakan.\n\n🚀 ${cta}`,
          },
        ],
      };
    },
  },
];

// Organic & Knowledge Vault Content Archetypes for High-Signal Practitioner Threads
export const getOrganicArchetypes = (store?: HermesStoreInfo) => {
  const handle = store?.username || 'tokodigital.id';
  return [
    {
      title: '[Workflow] 3 Praktik CLI & Terminal untuk Mempercepat Eksekusi',
      hookAngle: 'Tech & Workflow Architecture',
      posts: [
        {
          orderIndex: 0,
          content: 'Mengurangi pergantian context (context-switching) antara GUI dan editor adalah kunci menjaga flow state engineering 🛠️\n\n3 konfigurasi terminal yang langsung terasa dampaknya 🧵👇',
        },
        {
          orderIndex: 1,
          content: '1. Aliases & Shell Functions: Singkat perintah git & docker berulang menjadi 2-3 karakter.\n2. Fuzzy Finder (fzf): Navigasi ribuan file dalam hitungan milidetik tanpa mouse.\n3. Session Persistence: Gunakan tmux / zellij agar workspace selalu siap pakai saat terminal dibuka kembali.',
        },
        {
          orderIndex: 2,
          content: `Simpan thread ini untuk referensi setup workstation Anda! 📌\n\nFollow @${handle} untuk insight arsitektur software dan optimasi tools digital 🚀`,
        },
      ],
    },
    {
      title: '[AI Engineering] Mental Model Context Engineering untuk LLM Agent',
      hookAngle: 'Tech & AI Insights',
      posts: [
        {
          orderIndex: 0,
          content: 'Prompt engineering bukan sekadar menyusun kata mutiara, melainkan merancang arsitektur context yang deterministic untuk model AI 🧠\n\n3 komponen context payload yang terbukti memangkas halusinasi 🧵👇',
        },
        {
          orderIndex: 1,
          content: '1. System Directives: Definisikan batasan peran, constraint output, dan format strictly JSON.\n2. Grounding Context: Suntikkan data spesifik atau RAG chunk relevan sebelum query utama.\n3. Few-shot Demonstrations: Berikan 1-2 contoh pasangan input-output riil sebagai acuan struktur.',
        },
        {
          orderIndex: 2,
          content: `Bagaimana pendekatan context engineering di pipeline Anda saat ini? Diskusi di replies yuk! 👇\n\nFollow @${handle} untuk wawasan AI systems & software craft.`,
        },
      ],
    },
    {
      title: '[Engineering Practice] Review Loop & Automated Verification',
      hookAngle: 'Software Engineering & Best Practices',
      posts: [
        {
          orderIndex: 0,
          content: 'Bottleneck terbesar dalam shipping software berkualitas bukanlah kecepatan mengetik kode, melainkan loop verifikasi yang lambat ⚙️\n\nCara membangun feedback loop cepat sebelum commit 🧵👇',
        },
        {
          orderIndex: 1,
          content: '• Pre-commit hooks: Jalankan linting, typechecking, dan security scan otomatis secara lokal.\n• Targeted unit tests: Verifikasi boundary conditions pada pure functions dalam < 2 detik.\n• Isolated environments: Pisahkan dev, staging, dan prod database agar tidak terjadi cross-contamination.',
        },
        {
          orderIndex: 2,
          content: `Disiplin verifikasi lokal menghemat jam debugging di production.\n\nSimpan thread ini 📌 dan follow @${handle} untuk artikel sistem & engineering practices.`,
        },
      ],
    },
    {
      title: '[Architecture] 4 Kategori Tools Esensial untuk Modern Developer Stack',
      hookAngle: 'Rekomendasi Tools Digital',
      posts: [
        {
          orderIndex: 0,
          content: 'Membangun workstation yang lean memerlukan pemilihan tools dengan rasio utility-to-overhead terbaik 🛠️\n\n4 pilar stack digital untuk meningkatkan output kerja harian 🧵👇',
        },
        {
          orderIndex: 1,
          content: '1. AI Coding Assistant: Mempercepat prototyping dan eksplorasi boilerplate.\n2. Local Container Runtime: Isolasi dependencies tanpa mengotori host OS.\n3. Structured Note Vault: Dokumentasikan mental model dan arsitektur keputusan teknis.\n4. Automated CI/CD Runner: Validasi build dan deployment tanpa intervensi manual.',
        },
        {
          orderIndex: 2,
          content: `Pastikan semua dependensi dan akun kerja Anda menggunakan lisensi resmi untuk kelancaran jangka panjang.\n\n👉 Cek rekomendasi tools pendukung di bio @${handle} ya! 🚀`,
        },
      ],
    },
  ];
};

export async function runHermesRunner(options: RunnerOptions = {}) {
  const baseUrl = (options.baseUrl || process.env.HERMES_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const apiKey = options.apiKey || process.env.HERMES_API_KEY || 'hermes-secret-key-2026';
  const action = options.action || 'all';

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const results = {
    generatedCount: 0,
    publishedCount: 0,
    errors: [] as string[],
  };

  console.log('\n==================================================');
  console.log(`🤖 HERMES AGENT CRON RUNNER — [${action.toUpperCase()}]`);
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`🔑 Auth: Bearer ${apiKey.slice(0, 8)}...`);
  console.log('==================================================\n');

  // ACTION: GENERATE
  if (action === 'generate' || action === 'all') {
    console.log('📥 [Step 1] Mengambil katalog produk aktif...');
    try {
      const prodRes = await fetch(`${baseUrl}/api/hermes/products/active`, { headers });
      if (!prodRes.ok) {
        throw new Error(`Gagal fetch produk aktif: HTTP ${prodRes.status} ${prodRes.statusText}`);
      }
      const prodData = await prodRes.json();
      const products: HermesProduct[] = prodData.products || prodData.data || [];
      const store: HermesStoreInfo = prodData.store || { name: 'Toko Digital ID', username: 'tokodigital.id' };
      console.log(`   Ditemukan ${products.length} produk aktif.`);
      console.log(`   Store Profile: ${store.name} (@${store.username})`);

      // 1. Generate Product Drafts with LRU Product and Angle Rotation
      if (products.length > 0) {
        const targetProducts = products.slice(0, 2);
        for (const product of targetProducts) {
          const allAngles = GENERATION_ANGLES.map((a) => a.name);
          const chosenAngle = selectRotatedAngle(allAngles, []);
          console.log(`✍️  [AI Product Generator] Menghasilkan draft untuk "${product.name}" (${chosenAngle})...`);

          let generatedData;
          try {
            generatedData = await generateDraftWithHermes({
              product: {
                id: product.id,
                name: product.name,
                category: product.category,
                description: product.description,
                variants: product.variants,
                usp: product.usp,
                targetAudience: product.targetAudience,
                toneOfVoice: product.toneOfVoice,
                ctaTemplate: product.ctaTemplate,
              },
              store,
              angle: chosenAngle,
            });
          } catch {
            const matchedArchetype = HUMANIZED_HOOK_ARCHETYPES.find((a) => a.angle === chosenAngle) || HUMANIZED_HOOK_ARCHETYPES[0];
            const fallback = matchedArchetype.generate(product, store);
            generatedData = {
              title: fallback.title,
              hookAngle: matchedArchetype.angle,
              posts: fallback.posts,
              metadata: { generatorSource: 'hermes-archetype-fallback' },
            };
          }

          const draftPayload = {
            productId: product.id,
            title: generatedData.title,
            type: generatedData.posts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE',
            hookAngle: generatedData.hookAngle,
            posts: generatedData.posts,
            metadata: {
              runner: 'hermes-cron-runner-ts',
              persona: 'CLEAN_COMMERCIAL_PROMO',
              contentType: 'PRODUCT_PROMO',
              storeUsername: store.username,
              generatedAt: new Date().toISOString(),
              model: 'ag/gemini-3.6-flash-high',
              ...(generatedData.metadata || {}),
            },
          };

          const createRes = await fetch(`${baseUrl}/api/hermes/drafts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(draftPayload),
          });

          if (!createRes.ok) {
            const errJson = await createRes.json().catch(() => ({}));
            throw new Error(`Gagal membuat draft produk: ${errJson.error || createRes.statusText}`);
          }

          const createdJson = await createRes.json();
          const draft = createdJson.draft || createdJson.data;
          console.log(`   ✅ Draft produk tersimpan (ID: ${draft.id}) — Status: PENDING_REVIEW`);
          results.generatedCount++;
        }
      }

      // 2. Generate Organic / Non-Product Engagement Draft (productId: null) from Knowledge Vault
      let chosenTopic: KnowledgeTopic | null = null;
      try {
        const vaultTopics = await loadAllKnowledgeTopics();
        if (vaultTopics.length > 0) {
          chosenTopic = selectLRUKnowledgeTopic(vaultTopics, []);
        }
      } catch (err) {
        console.warn('[Knowledge Vault Loader] Fallback to dynamic topics:', err);
      }

      const topicLabel = chosenTopic ? chosenTopic.title : 'Wawasan Digital & Tips Produktivitas';
      console.log(`✍️  [AI Organic Generator] Menghasilkan konten edukasi non-produk: "${topicLabel}"...`);

      let orgGenerated;
      try {
        orgGenerated = await generateDraftWithHermes({
          product: null,
          store,
          knowledgeTopic: chosenTopic,
          angle: chosenTopic ? chosenTopic.category : 'Edukasi & Produktivitas Organik',
        });
      } catch {
        const organicArchetypes = getOrganicArchetypes(store);
        const randomOrganic = organicArchetypes[Math.floor(Math.random() * organicArchetypes.length)];
        orgGenerated = {
          title: randomOrganic.title,
          hookAngle: randomOrganic.hookAngle,
          posts: randomOrganic.posts,
          metadata: { generatorSource: 'hermes-archetype-fallback' },
        };
      }

      const organicDraftPayload = {
        productId: null,
        title: orgGenerated.title,
        type: orgGenerated.posts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE',
        hookAngle: orgGenerated.hookAngle,
        posts: orgGenerated.posts,
        metadata: {
          runner: 'hermes-cron-runner-ts',
          persona: 'TECH_SYSTEMS_PRACTITIONER',
          contentType: 'ORGANIC_ENGAGEMENT',
          storeUsername: store.username,
          generatedAt: new Date().toISOString(),
          model: 'ag/gemini-3.6-flash-high',
          ...(chosenTopic
            ? {
                sourceTopicId: chosenTopic.id,
                sourceTopicTitle: chosenTopic.title,
                sourceCategory: chosenTopic.category,
                generatedFrom: 'OBSIDIAN_KNOWLEDGE_VAULT',
              }
            : {}),
          ...(orgGenerated.metadata || {}),
        },
      };

      const organicRes = await fetch(`${baseUrl}/api/hermes/drafts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(organicDraftPayload),
      });

      if (!organicRes.ok) {
        const errJson = await organicRes.json().catch(() => ({}));
        throw new Error(`Gagal membuat draft organik: ${errJson.error || organicRes.statusText}`);
      }

      const organicJson = await organicRes.json();
      const organicDraft = organicJson.draft || organicJson.data;
      console.log(`   ✅ Draft organik tersimpan (ID: ${organicDraft.id}) — Status: PENDING_REVIEW`);
      results.generatedCount++;
    } catch (err: any) {
      console.error(`   ❌ Error saat generate:`, err.message);
      results.errors.push(`Generate error: ${err.message}`);
    }
  }

  // ACTION: POST
  if (action === 'post' || action === 'all') {
    console.log('\n📤 [Step 2] Mengambil antrean draft yang disetujui (APPROVED)...');
    try {
      const draftRes = await fetch(`${baseUrl}/api/hermes/drafts/approved`, { headers });
      if (!draftRes.ok) {
        throw new Error(`Gagal fetch draft approved: HTTP ${draftRes.status} ${draftRes.statusText}`);
      }
      const draftData = await draftRes.json();
      const approvedDrafts: HermesDraftItem[] = draftData.drafts || draftData.data || [];
      console.log(`   Ditemukan ${approvedDrafts.length} draft siap posting.`);

      // Fetch store settings for post URL handle & Threads API credentials
      let storeUsername = 'tokodigital.id';
      let threadsAccessToken = options.threadsAccessToken !== undefined ? options.threadsAccessToken : (process.env.THREADS_ACCESS_TOKEN || '');
      let threadsUserId = options.threadsUserId !== undefined ? options.threadsUserId : (process.env.THREADS_USER_ID || '');

      try {
        const settingsRes = await fetch(`${baseUrl}/api/settings`, { headers });
        if (settingsRes.ok) {
          const sJson = await settingsRes.json();
          const s = sJson.settings || {};
          storeUsername = s.STORE_USERNAME || storeUsername;
          if (options.threadsAccessToken === undefined && !threadsAccessToken && s.THREADS_ACCESS_TOKEN) {
            threadsAccessToken = s.THREADS_ACCESS_TOKEN;
          }
          if (options.threadsUserId === undefined && !threadsUserId && s.THREADS_USER_ID) {
            threadsUserId = s.THREADS_USER_ID;
          }
        }
      } catch {
        // fallback
      }

      for (const draft of approvedDrafts) {
        console.log(`🚀 [Threads Publisher] Memposting draft "${draft.title}" (ID: ${draft.id})...`);

        try {
          let finalPostId = '';
          let finalPostUrl = '';

          if (threadsAccessToken) {
            console.log(`   🌐 Menghubungi Meta Threads Graph API (User ID: ${threadsUserId || 'me'})...`);
            const published = await publishDraftToThreadsGraphApi(
              draft,
              threadsAccessToken,
              threadsUserId,
              storeUsername
            );
            finalPostId = published.threadPostId;
            finalPostUrl = published.threadPostUrl;
          } else {
            console.log(`   ⚠️ [Mode Simulasi] THREADS_ACCESS_TOKEN tidak ditemukan, menggunakan mock ID...`);
            finalPostId = `th_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            finalPostUrl = `https://threads.net/@${storeUsername}/post/${Date.now().toString(36)}`;
          }

          const updateRes = await fetch(`${baseUrl}/api/hermes/drafts/${draft.id}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'PUBLISHED',
              threadPostId: finalPostId,
              threadPostUrl: finalPostUrl,
            }),
          });

          if (!updateRes.ok) {
            const errJson = await updateRes.json().catch(() => ({}));
            throw new Error(`Gagal update status posting draft ${draft.id}: ${errJson.error || updateRes.statusText}`);
          }

          console.log(`   ✅ Berhasil dipublikasikan ke Threads!`);
          console.log(`   🔗 Live URL: ${finalPostUrl}`);
          results.publishedCount++;
        } catch (draftErr: any) {
          console.error(`   ❌ Gagal memposting draft ${draft.id}:`, draftErr.message);
          results.errors.push(`Publish error on ${draft.id}: ${draftErr.message}`);

          // Update status to FAILED
          await fetch(`${baseUrl}/api/hermes/drafts/${draft.id}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'FAILED',
              errorMessage: draftErr.message,
            }),
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error(`   ❌ Error saat post:`, err.message);
      results.errors.push(`Post error: ${err.message}`);
    }
  }

  console.log('\n==================================================');
  console.log(`🎉 RUNNER SELESAI:`);
  console.log(`   - Draft Dibuat: ${results.generatedCount}`);
  console.log(`   - Draft Diposting: ${results.publishedCount}`);
  console.log(`   - Total Error: ${results.errors.length}`);
  console.log('==================================================\n');

  return results;
}

// Execute directly if run via CLI
if (process.argv[1]?.includes('hermes_mock_cron.ts')) {
  const args = process.argv.slice(2);
  let action: 'generate' | 'post' | 'all' = 'all';
  let baseUrl = process.env.HERMES_BASE_URL || 'http://localhost:3000';
  let apiKey = process.env.HERMES_API_KEY || 'hermes-secret-key-2026';

  let threadsAccessToken = process.env.THREADS_ACCESS_TOKEN || '';
  let threadsUserId = process.env.THREADS_USER_ID || '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--action=')) {
      const act = arg.split('=')[1] as any;
      if (['generate', 'post', 'all'].includes(act)) action = act;
    } else if (arg === '--action' && args[i + 1]) {
      const act = args[++i] as any;
      if (['generate', 'post', 'all'].includes(act)) action = act;
    } else if (arg.startsWith('--base-url=')) {
      baseUrl = arg.split('=')[1];
    } else if (arg === '--base-url' && args[i + 1]) {
      baseUrl = args[++i];
    } else if (arg.startsWith('--api-key=')) {
      apiKey = arg.split('=')[1];
    } else if (arg === '--api-key' && args[i + 1]) {
      apiKey = args[++i];
    } else if (arg.startsWith('--threads-access-token=')) {
      threadsAccessToken = arg.split('=')[1];
    } else if (arg === '--threads-access-token' && args[i + 1]) {
      threadsAccessToken = args[++i];
    } else if (arg.startsWith('--threads-user-id=')) {
      threadsUserId = arg.split('=')[1];
    } else if (arg === '--threads-user-id' && args[i + 1]) {
      threadsUserId = args[++i];
    }
  }

  runHermesRunner({ action, baseUrl, apiKey, threadsAccessToken, threadsUserId }).catch((err) => {
    console.error('Fatal Runner Error:', err);
    process.exit(1);
  });
}
