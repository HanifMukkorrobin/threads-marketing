import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. System Configurations
  const configs = [
    {
      key: 'HERMES_API_KEY',
      value: 'hermes-secret-key-2026',
      description: 'API key for authenticating external Hermes AI agents',
    },
    {
      key: 'STORE_USERNAME',
      value: 'tokodigital.id',
      description: 'Default Threads username for bio references and CTAs',
    },
    {
      key: 'STORE_NAME',
      value: 'Toko Digital ID',
      description: 'Display name of the digital store',
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {
        value: config.value,
        description: config.description,
      },
      create: config,
    });
  }
  console.log('✅ System configurations seeded.');

  // 2. Products Catalog
  const products = [
    {
      name: 'YouTube Premium',
      slug: 'youtube-premium',
      category: 'Streaming Video',
      description: 'Langganan YouTube Premium legal anti-hold, putar video & musik di background tanpa iklan sama sekali.',
      variants: JSON.stringify([
        { name: '1 Bulan', price: 25000, duration: '30 hari' },
        { name: '3 Bulan', price: 65000, duration: '90 hari' },
        { name: '1 Tahun', price: 220000, duration: '365 hari' },
      ]),
      usp: JSON.stringify([
        'Garansi Full',
        'No VPN',
        'Bisa Akun Pribadi',
        'Bebas Iklan Video & YouTube Music',
        'Download Offline',
      ]),
      targetAudience: 'Mahasiswa, pekerja kantoran, wfh, penikmat podcast & musik',
      toneOfVoice: 'Santai, solutif, FOMO, relatable',
      ctaTemplate: 'Langsung amankan slot kamu lewat link di bio!',
      isActive: true,
    },
    {
      name: 'Spotify Premium',
      slug: 'spotify-premium',
      category: 'Music & Audio',
      description: 'Dengerin musik jutaan lagu tanpa jeda iklan, skip lagu sepuasnya, kualitas audio tertinggi.',
      variants: JSON.stringify([
        { name: '1 Bulan Individual', price: 20000, duration: '30 hari' },
        { name: '3 Bulan Individual', price: 50000, duration: '90 hari' },
        { name: '1 Tahun Individual', price: 170000, duration: '365 hari' },
      ]),
      usp: JSON.stringify([
        'Bebas Iklan',
        'Download Offline',
        'Audio High Quality 320kbps',
        'Bisa Akun Pribadi',
        'Garansi Full 100%',
      ]),
      targetAudience: 'Pecinta musik harian, komuter, gym goers',
      toneOfVoice: 'Casual, asik, to the point',
      ctaTemplate: 'Yuk upgrade sekarang sebelum kehabisan slot promo, link di bio!',
      isActive: true,
    },
    {
      name: 'Netflix Premium 4K UHD',
      slug: 'netflix-premium-4k',
      category: 'Streaming Movies',
      description: 'Streaming film dan series bioskop kualitas 4K UHD Dolby Atmos, profil privat pakai PIN.',
      variants: JSON.stringify([
        { name: '1 Bulan 1 Profil', price: 35000, duration: '30 hari' },
        { name: '3 Bulan 1 Profil', price: 99000, duration: '90 hari' },
      ]),
      usp: JSON.stringify([
        'Ultra HD 4K',
        'Anti On-Hold Screen',
        'Garansi Replace',
        '1 User 1 Profil Ber-PIN',
        'Support All Devices (TV, HP, Laptop)',
      ]),
      targetAudience: 'Pecinta drakor, movie enthusiast, marathon series weekend',
      toneOfVoice: 'Excited, FOMO pop-culture, racun hemat',
      ctaTemplate: 'Cek link bio sekarang, nonton weekend ini tanpa ribet!',
      isActive: true,
    },
  ];

  const seededProducts: Record<string, string> = {};

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: productData,
      create: productData,
    });
    seededProducts[product.slug] = product.id;
  }
  console.log('✅ Products catalog seeded.');

  // 3. Sample Draft with DraftPostItems
  const ytProductId = seededProducts['youtube-premium'];

  // Check if sample draft already exists
  const existingDraft = await prisma.contentDraft.findFirst({
    where: { title: 'Rahasia Dengerin Musik & Nonton YouTube Bebas Iklan Cuma 25rb' },
  });

  if (!existingDraft) {
    await prisma.contentDraft.create({
      data: {
        productId: ytProductId,
        title: 'Rahasia Dengerin Musik & Nonton YouTube Bebas Iklan Cuma 25rb',
        type: 'THREAD_CHAIN',
        status: 'PENDING_REVIEW',
        hookAngle: 'Problem-Agitate-Solve: Kesel sering kena iklan 15 detik unskippable',
        source: 'HERMES_AI',
        metadata: JSON.stringify({
          aiModel: 'hermes-3-llama-3.1-8b',
          version: '1.0',
          generatedAt: new Date().toISOString(),
        }),
        posts: {
          create: [
            {
              orderIndex: 0,
              content:
                'Lagi asik dengerin musik atau podcast di YouTube, tiba-tiba jeda iklan 15 detik unskippable 2x berturut-turut? 😤\n\nNih cara nonton bebas iklan cuma 25rb sebulan tanpa VPN! 🧵👇',
            },
            {
              orderIndex: 1,
              content:
                'Kenapa harus beli di Toko Digital ID?\n✅ Pakai akun email pribadi kamu sendiri\n✅ Nggak perlu instal VPN ribet\n✅ Full garansi replace selama masa langganan aktif\n✅ Bonus akses YouTube Music Premium!',
            },
            {
              orderIndex: 2,
              content:
                'Yuk checkout sekarang sebelum promo habis! Klik link di bio kami @tokodigital.id yaa 🚀',
            },
          ],
        },
      },
    });
    console.log('✅ Sample content draft with 3 thread posts seeded.');
  }

  console.log('🚀 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
