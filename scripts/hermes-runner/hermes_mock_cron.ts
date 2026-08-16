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
}

export interface HermesProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  variants: Array<{ name: string; price: number; duration?: string }>;
  usp: string[];
  toneOfVoice?: string;
  ctaTemplate?: string;
}

export interface HermesDraftItem {
  id: string;
  title: string;
  status: string;
  type: string;
  hookAngle?: string;
  posts: Array<{ orderIndex: number; content: string }>;
}

// Copy templates based on proven copywriting archetypes
const HOOK_ARCHETYPES = [
  {
    angle: 'Problem-Agitate-Solve',
    generate: (p: HermesProduct) => ({
      title: `[PAS] Stop Boros Langganan ${p.name}`,
      posts: [
        {
          orderIndex: 0,
          content: `Masih sering boncos bayar langganan ${p.name} tiap bulan? 💸\n\nPadahal ada cara legal, anti-hold, & full garansi tanpa bikin kantong jebol. Simak tipsnya di thread ini 🧵👇`,
        },
        {
          orderIndex: 1,
          content: `Kenapa harus bayar mahal kalau fitur yang kamu dapet 100% sama?\n\n✨ Keunggulan utama:\n${p.usp.map((u) => `• ${u}`).join('\n')}\n\nPilihan paket mulai dari Rp ${(p.variants[0]?.price || 25000).toLocaleString('id-ID')} aja!`,
        },
        {
          orderIndex: 2,
          content: `Cara order cepat:\n1. Klik link di profil @tokodigital.id\n2. Pilih paket ${p.name}\n3. Akun aktif instan dalam hitungan menit ⚡️\n\n${p.ctaTemplate || 'Order sekarang sebelum kuota promo habis!'}`
        }
      ]
    })
  },
  {
    angle: 'Cost Comparison',
    generate: (p: HermesProduct) => ({
      title: `[Hemat] Perbandingan Harga ${p.name}`,
      posts: [
        {
          orderIndex: 0,
          content: `Nonton & nikmatin ${p.name} legal hemat hingga 70%? Bukan sulap bukan sihir! 🤯✨\n\nYuk bandingin pengeluaran bulanan kamu 🧵👇`,
        },
        {
          orderIndex: 1,
          content: `📊 Bandingkan harganya:\n\n❌ Harga Normal: Rp ${(p.variants[0]?.price ? p.variants[0].price * 3 : 150000).toLocaleString('id-ID')}/bln\n✅ Di Toko Digital ID: Cuma Rp ${(p.variants[0]?.price || 29000).toLocaleString('id-ID')}/bln!\n\nSemua akun bergaransi resmi & support 24/7.`,
        },
        {
          orderIndex: 2,
          content: `Jangan sampai kehabisan slot sharing legal hari ini.\n\n👉 Cek ketersediaan via link di bio sekarang juga! 🚀`
        }
      ]
    })
  },
  {
    angle: 'Secret Hack / Lifehack',
    generate: (p: HermesProduct) => ({
      title: `[Hack] Trik Maksimalkan ${p.name}`,
      posts: [
        {
          orderIndex: 0,
          content: `Trik rahasia yang jarang orang tahu saat pakai ${p.name} di tahun 2026! 💡\n\nBikin pengalaman digitalmu makin smooth tanpa ribet 🧵👇`,
        },
        {
          orderIndex: 1,
          content: `Gak perlu bingung metode pembayaran luar negeri atau kena blokir kartu.\n\nDengan layanan kami, kamu langsung terima akun siap pakai dengan jaminan:\n${p.usp.slice(0, 3).map((u) => `✔️ ${u}`).join('\n')}`,
        },
        {
          orderIndex: 2,
          content: `Yuk upgrade akunmu sekarang tanpa drama.\n\n🔗 Link pemesanan resmi ada di bio profil kami!`
        }
      ]
    })
  }
];

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
      console.log(`   Ditemukan ${products.length} produk aktif.`);

      if (products.length === 0) {
        console.log('   ℹ️ Tidak ada produk aktif untuk dibuatkan draft.');
      } else {
        // Pick active products and create draft
        for (const product of products.slice(0, 2)) {
          const randomArchetype = HOOK_ARCHETYPES[Math.floor(Math.random() * HOOK_ARCHETYPES.length)];
          const generatedData = randomArchetype.generate(product);

          console.log(`✍️  [AI Generator] Menghasilkan draft untuk "${product.name}" (${randomArchetype.angle})...`);

          const draftPayload = {
            productId: product.id,
            title: generatedData.title,
            type: 'THREAD_CHAIN',
            hookAngle: randomArchetype.angle,
            posts: generatedData.posts,
            metadata: {
              runner: 'hermes-cron-runner-ts',
              generatedAt: new Date().toISOString(),
              model: 'hermes-3-70b',
            },
          };

          const createRes = await fetch(`${baseUrl}/api/hermes/drafts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(draftPayload),
          });

          if (!createRes.ok) {
            const errJson = await createRes.json().catch(() => ({}));
            throw new Error(`Gagal membuat draft: ${errJson.error || createRes.statusText}`);
          }

          const createdJson = await createRes.json();
          const draft = createdJson.draft || createdJson.data;
          console.log(`   ✅ Draft tersimpan (ID: ${draft.id}) — Status: PENDING_REVIEW`);
          results.generatedCount++;
        }
      }
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

      for (const draft of approvedDrafts) {
        console.log(`🚀 [Threads Publisher] Memposting draft "${draft.title}" (ID: ${draft.id})...`);

        // Simulate Threads Graph API publish latency & generation of post ID
        const fakePostId = `th_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const fakePostUrl = `https://threads.net/@tokodigital.id/post/${Date.now().toString(36)}`;

        const updateRes = await fetch(`${baseUrl}/api/hermes/drafts/${draft.id}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'PUBLISHED',
            threadPostId: fakePostId,
            threadPostUrl: fakePostUrl,
          }),
        });

        if (!updateRes.ok) {
          const errJson = await updateRes.json().catch(() => ({}));
          throw new Error(`Gagal update status posting draft ${draft.id}: ${errJson.error || updateRes.statusText}`);
        }

        console.log(`   ✅ Berhasil dipublikasikan ke Threads!`);
        console.log(`   🔗 Live URL: ${fakePostUrl}`);
        results.publishedCount++;
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
    }
  }

  runHermesRunner({ action, baseUrl, apiKey }).catch((err) => {
    console.error('Fatal Runner Error:', err);
    process.exit(1);
  });
}
