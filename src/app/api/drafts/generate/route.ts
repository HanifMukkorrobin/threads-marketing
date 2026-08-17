import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatProduct } from '@/lib/products';
import { generateDraftWithHermes, GENERATION_ANGLES } from '@/lib/generation-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    success: true,
    angles: GENERATION_ANGLES,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, angle, customTopic, targetAudience, autoSave = false } = body;

    let formattedProduct = null;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (product) {
        formattedProduct = formatProduct(product);
      }
    }

    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }
    const store = {
      name: configMap['STORE_NAME'] || 'Toko Digital ID',
      username: configMap['STORE_USERNAME'] || 'tokodigital.id',
    };

    const generationResult = await generateDraftWithHermes({
      product: formattedProduct,
      store,
      angle: angle || null,
      customTopic: customTopic || null,
      targetAudience: targetAudience || null,
    });

    // If autoSave requested, persist directly to database
    if (autoSave) {
      const createdDraft = await prisma.contentDraft.create({
        data: {
          title: generationResult.title,
          productId: formattedProduct ? formattedProduct.id : null,
          hookAngle: generationResult.hookAngle,
          type: generationResult.posts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE',
          status: 'PENDING_REVIEW',
          source: 'HERMES_AI',
          metadata: JSON.stringify({
            ...generationResult.metadata,
            angleUsed: generationResult.hookAngle,
            customTopic: customTopic || null,
          }),
          posts: {
            create: generationResult.posts.map((p, idx) => ({
              orderIndex: idx,
              content: p.content,
              mediaUrl: p.mediaUrl || null,
            })),
          },
        },
        include: {
          product: true,
          posts: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          draft: createdDraft,
          title: generationResult.title,
          hookAngle: generationResult.hookAngle,
          posts: generationResult.posts,
        },
        message: 'Draft baru berhasil dibuat oleh Hermes Agent!',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        title: generationResult.title,
        hookAngle: generationResult.hookAngle,
        posts: generationResult.posts,
        metadata: generationResult.metadata,
      },
      message: 'Draft berhasil digenerate oleh Hermes Agent.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/drafts/generate:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menghasilkan draft AI' },
      { status: 500 }
    );
  }
}
