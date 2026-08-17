import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDraft } from '@/lib/drafts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status')?.trim();
    const productId = searchParams.get('productId')?.trim();
    const search = searchParams.get('search')?.trim();

    const whereClause: any = {};

    if (status && status !== 'ALL' && status !== 'Semua') {
      whereClause.status = status;
    }

    if (productId && productId !== 'ALL' && productId !== 'Semua') {
      whereClause.productId = productId;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { hookAngle: { contains: search } },
        {
          posts: {
            some: {
              content: { contains: search },
            },
          },
        },
      ];
    }

    const rawDrafts = await prisma.contentDraft.findMany({
      where: whereClause,
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const drafts = rawDrafts.map(formatDraft);

    return NextResponse.json({
      success: true,
      count: drafts.length,
      drafts,
      data: drafts,
    });
  } catch (error) {
    console.error('Error in GET /api/drafts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching drafts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      productId,
      type,
      hookAngle,
      posts,
      metadata,
      source = 'MANUAL',
      status = 'PENDING_REVIEW',
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Draft title is required' },
        { status: 400 }
      );
    }

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Draft requires at least one post item in posts array' },
        { status: 400 }
      );
    }

    // Verify product exists if productId provided
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Associated product not found' },
          { status: 404 }
        );
      }
    }

    const calculatedType =
      type === 'THREAD_CHAIN' || posts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE';

    let serializedMetadata: string | null = null;
    if (metadata) {
      serializedMetadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    }

    const postCreates = posts.map((p: any, idx: number) => ({
      orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : idx,
      content: p.content ? String(p.content) : '',
      mediaUrl: p.mediaUrl ? String(p.mediaUrl).trim() : null,
    }));

    const rawDraft = await prisma.contentDraft.create({
      data: {
        title: title.trim(),
        productId: productId || null,
        type: calculatedType,
        status,
        source: source || 'MANUAL',
        hookAngle: hookAngle ? String(hookAngle).trim() : null,
        metadata: serializedMetadata,
        posts: {
          create: postCreates,
        },
      },
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const draft = formatDraft(rawDraft);

    return NextResponse.json(
      {
        success: true,
        data: draft,
        draft,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/drafts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating draft' },
      { status: 500 }
    );
  }
}
