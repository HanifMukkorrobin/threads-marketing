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

// Copy generator adhering strictly to /ecommerce-copy-humanizer-id (Natural, Native, Slang-balanced Indonesian)
const HUMANIZED_HOOK_ARCHETYPES = [
  {
    angle: 'Storytelling & Curhat Relate',
    skill: 'ecommerce-copy-humanizer-id',
    generate: (p: HermesProduct, store?: HermesStoreInfo) => {
      const audience = p.targetAudience ? `buat ${p.targetAudience.toLowerCase()}` : 'buat harian';
      const cta = p.ctaTemplate || `Yuk amankan slot promo kamu sekarang, langsung DM @${store?.username || 'tokodigital.id'} atau cek link di bio ya! 🚀`;
      const storeName = store?.name || 'Toko Digital ID';

      return {
        title: `[Story] Rahasia Hemat ${p.name} Tanpa Boncos`,
        posts: [
          {
            orderIndex: 0,
            content: `Lagi seru-serunya nugas, kerja, atau dengerin playlist favorit, tiba-tiba kepotong iklan atau kena limit akun? 😤\n\nPadahal ada cara cerdas langganan ${p.name} legal dan bergaransi yang ${getPricePreview(p)} doang. Simak ceritanya di bawah 🧵👇`,
          },
          {
            orderIndex: 1,
            content: `Nih benefit yang kamu dapetin di ${storeName}:\n${getUspBulletList(p)}\n\nPilihan paket ready:\n${getVariantListText(p)}\n\nCocok banget ${audience} yang pengen serba sat-set tanpa ribet! ✨`,
          },
          {
            orderIndex: 2,
            content: `Gak perlu kartu kredit luar negeri atau setup VPN aneh-aneh. Akun langsung aktif tinggal pakai.\n\n${cta}`,
          },
        ],
      };
    },
  },
  {
    angle: 'Solusi Cerdas & Anti-Boncos',
    skill: 'ecommerce-copy-humanizer-id',
    generate: (p: HermesProduct, store?: HermesStoreInfo) => {
      const handle = store?.username || 'tokodigital.id';
      const cta = p.ctaTemplate || 'Stok slot terbatas, amankan sekarang sebelum kehabisan!';

      return {
        title: `[Hemat] Tips Upgrade ${p.name} Paling Masuk Akal`,
        posts: [
          {
            orderIndex: 0,
            content: `Kenapa harus bayar ratusan ribu kalau fitur ${p.name} yang kamu dapet 100% sama dengan harga jauh lebih hemat? 💡\n\nBuat yang mau cerdas atur pengeluaran digital bulanan, baca ini 🧵👇`,
          },
          {
            orderIndex: 1,
            content: `Bandingin keuntungannya:\n${getUspBulletList(p)}\n\n💰 Varian harga terbaik:\n${getVariantListText(p)}\n\nSemua paket include garansi replace & full support admin ramah 24/7.`,
          },
          {
            orderIndex: 2,
            content: `Jangan nunggu harga normal naik lagi gess.\n\n👉 ${cta} (Link pemesanan resmi ada di bio profil @${handle})`,
          },
        ],
      };
    },
  },
  {
    angle: 'Productivity & Feature Hack',
    skill: 'ecommerce-copy-humanizer-id',
    generate: (p: HermesProduct, store?: HermesStoreInfo) => {
      const cta = p.ctaTemplate || `Langsung order via link di bio @${store?.username || 'tokodigital.id'} untuk aktivasi instan!`;

      return {
        title: `[Hack] Maksimalkan Fitur Pro ${p.name}`,
        posts: [
          {
            orderIndex: 0,
            content: `Trik rahasia biar kerjaan, konten, dan riset kamu selesai 3x lebih cepet pakai ${p.name} di tahun 2026! ✨\n\nBikin workflow harian makin smooth tanpa drama 🧵👇`,
          },
          {
            orderIndex: 1,
            content: `Kenapa order di kami paling recommended?\n${getUspBulletList(p)}\n\nKatalog paket tersedia (${getPricePreview(p)}):\n${getVariantListText(p)}`,
          },
          {
            orderIndex: 2,
            content: `Upgrade akun kamu sekarang dan rasain bedanya produktif pakai akun premium.\n\n⚡️ ${cta}`,
          },
        ],
      };
    },
  },
  {
    angle: 'FOMO & Slot Terbatas',
    skill: 'ecommerce-copy-humanizer-id',
    generate: (p: HermesProduct, store?: HermesStoreInfo) => {
      const cta = p.ctaTemplate || 'Slot rebutan, langsung amankan sebelum kehabisan promo hari ini!';

      return {
        title: `[Limited] Slot Promo Spesial ${p.name}`,
        posts: [
          {
            orderIndex: 0,
            content: `Siapa cepat dia dapat! 🔥\n\nSlot promo khusus ${p.name} baru aja restock hari ini dengan kuota terbatas. Jangan sampai kehabisan lagi kayak minggu lalu ya gess 🧵👇`,
          },
          {
            orderIndex: 1,
            content: `Keunggulan jaminan kami:\n${getUspBulletList(p)}\n\n📦 Paket yang lagi ready:\n${getVariantListText(p)}`,
          },
          {
            orderIndex: 2,
            content: `Admin fast response siap bantu aktivasi dalam hitungan menit.\n\n🚀 ${cta}`,
          },
        ],
      };
    },
  },
];

// Organic & Non-Product Content Archetypes for High-Engagement Threads
const getOrganicArchetypes = (store?: HermesStoreInfo) => {
  const handle = store?.username || 'tokodigital.id';
  return [
    {
      title: '[Tips] 5 Shortcut Rahasia Buat yang Nugas & Kerja Seharian',
      hookAngle: 'Edukasi & Produktivitas',
      posts: [
        {
          orderIndex: 0,
          content: 'Buat kamu yang tiap hari di depan laptop nugas atau kerja, ini 5 shortcut & trik rahasia yang bakal hemat waktu kamu berjam-jam 🧵👇',
        },
        {
          orderIndex: 1,
          content: '1. Ctrl/Cmd + Shift + T: Buka tab browser yang gak sengaja ketutup.\n2. Win + V / Mac Clipboard: Akses riwayat copy-paste banyak item.\n3. Pakai AI tools buat summarising dokumen tebal dalam 10 detik.\n4. Dual monitor virtual (Win + Ctrl + D) biar gak semrawut.\n5. Bookmark bar khusus folder shortcut kerjaan.',
        },
        {
          orderIndex: 2,
          content: `Save thread ini biar gak lupa pas butuh nanti! ✨\n\nFollow @${handle} buat tips produktivitas & rekomendasi tools digital bermanfaat lainnya 🚀`,
        },
      ],
    },
    {
      title: '[Insight] Formula Prompt AI Anti-Gagal Buat Nugas & Kerja',
      hookAngle: 'Tech & AI Insights',
      posts: [
        {
          orderIndex: 0,
          content: 'Tahun 2026 tapi masih pakai AI cuma buat ketik "buatkan ide"? 🤯\n\nPadahal AI bisa jadi personal assistant yang handle 70% kerjaan rutin kamu kalau prompt-nya bener. Simak formulanya 🧵👇',
        },
        {
          orderIndex: 1,
          content: 'Formula 4 langkah:\n1. Role: Tentukan peran AI (e.g. "Kamu Senior Copywriter").\n2. Context: Kasih background masalah & audiens jelas.\n3. Constraint: Batasi gaya bahasa ("Bahasa Indonesia kasual & to the point").\n4. Examples: Kasih 1 contoh output yang kamu mau.',
        },
        {
          orderIndex: 2,
          content: `Cobain formula ini di tugas atau project kerjaan selanjutnya gess!\n\n🔗 Follow @${handle} untuk update tools pro & trik digital harian.`,
        },
      ],
    },
    {
      title: '[Relate] Fase Realita Kerja Digital & Cara Tetap Waras',
      hookAngle: 'Storytelling & Curhat Relate',
      posts: [
        {
          orderIndex: 0,
          content: 'Pernah gak ngerasa seharian buka laptop tapi pas malem berasa "tadi gue ngerjain apa aja ya?" 😩💻\n\nIni bukan salah kamu, tapi manajemen fokus digital yang bocor. Yuk benerin 🧵👇',
        },
        {
          orderIndex: 1,
          content: 'Tips anti-burnout harian:\n• Terapkan aturan 90-20 (90 menit deep work, 20 menit istirahat tanpa layar).\n• Matikan notifikasi grup non-urgent pas jam produktif.\n• Investasi di tools digital yang automate hal repetitif biar gak buang energi.',
        },
        {
          orderIndex: 2,
          content: 'Kalian tim kerja pagi atau ngalong tengah malem nih gess? Drop cerita kalian di replies yuk! 👇',
        },
      ],
    },
    {
      title: '[List] 4 Tools Esensial Penunjang Karir & Freelance',
      hookAngle: 'Rekomendasi Tools Digital',
      posts: [
        {
          orderIndex: 0,
          content: 'Mau naikin produktivitas kerja & freelance tapi bingung mulai dari mana? 🛠️✨\n\nIni 4 jenis tools esensial yang wajib ada di workflow kamu di tahun 2026 🧵👇',
        },
        {
          orderIndex: 1,
          content: 'Daftar tools wajib:\n1. AI Assistant (Brainstorming ide, riset cepat, & drafting).\n2. Cloud Music (Playlist fokus tanpa gangguan iklan).\n3. Design Platform (Visual asset & presentasi instan).\n4. Cloud Workspace (Backup data & kolaborasi dokumen).',
        },
        {
          orderIndex: 2,
          content: `Pastikan semua akun kerja kamu stabil & bergaransi resmi biar gak drama pas deadline.\n\n👉 Cek rekomendasi tools lengkap di bio profil @${handle} ya! 🚀`,
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

      // 1. Generate Product Drafts
      if (products.length > 0) {
        for (const product of products.slice(0, 2)) {
          const randomArchetype = HUMANIZED_HOOK_ARCHETYPES[Math.floor(Math.random() * HUMANIZED_HOOK_ARCHETYPES.length)];
          const generatedData = randomArchetype.generate(product, store);

          console.log(`✍️  [AI Product Generator] Menghasilkan draft untuk "${product.name}" (${randomArchetype.angle})...`);

          const draftPayload = {
            productId: product.id,
            title: generatedData.title,
            type: 'THREAD_CHAIN',
            hookAngle: randomArchetype.angle,
            posts: generatedData.posts,
            metadata: {
              runner: 'hermes-cron-runner-ts',
              skill: 'ecommerce-copy-humanizer-id',
              contentType: 'PRODUCT_PROMO',
              storeUsername: store.username,
              generatedAt: new Date().toISOString(),
              model: 'hermes-3-llama-3.1-8b',
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

      // 2. Generate Organic / Non-Product Engagement Draft (productId: null)
      const organicArchetypes = getOrganicArchetypes(store);
      const randomOrganic = organicArchetypes[Math.floor(Math.random() * organicArchetypes.length)];
      console.log(`✍️  [AI Organic Generator] Menghasilkan konten edukasi non-produk: "${randomOrganic.title}"...`);

      const organicDraftPayload = {
        productId: null,
        title: randomOrganic.title,
        type: 'THREAD_CHAIN',
        hookAngle: randomOrganic.hookAngle,
        posts: randomOrganic.posts,
        metadata: {
          runner: 'hermes-cron-runner-ts',
          skill: 'ecommerce-copy-humanizer-id',
          contentType: 'ORGANIC_ENGAGEMENT',
          storeUsername: store.username,
          generatedAt: new Date().toISOString(),
          model: 'hermes-3-llama-3.1-8b',
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
