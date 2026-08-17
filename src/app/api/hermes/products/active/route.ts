import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateHermesApiKey, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const isAuthorized = await validateHermesApiKey(req);
  if (!isAuthorized) {
    return unauthorizedResponse();
  }

  try {
    const rawProducts = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const products = rawProducts.map((p) => {
      let parsedVariants = [];
      let parsedUsp = [];

      try {
        parsedVariants = typeof p.variants === 'string' ? JSON.parse(p.variants || '[]') : p.variants;
      } catch {
        parsedVariants = [];
      }

      try {
        parsedUsp = typeof p.usp === 'string' ? JSON.parse(p.usp || '[]') : p.usp;
      } catch {
        parsedUsp = [];
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        description: p.description,
        variants: parsedVariants,
        usp: parsedUsp,
        targetAudience: p.targetAudience,
        toneOfVoice: p.toneOfVoice,
        ctaTemplate: p.ctaTemplate,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    const store = {
      name: configMap['STORE_NAME'] || 'Toko Digital ID',
      username: configMap['STORE_USERNAME'] || 'tokodigital.id',
      avatarUrl: configMap['STORE_AVATAR_URL'] || '',
    };

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
      data: products,
      store,
    });
  } catch (error) {
    console.error('Error in GET /api/hermes/products/active:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching active products' },
      { status: 500 }
    );
  }
}
