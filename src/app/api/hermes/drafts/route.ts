import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateHermesApiKey, unauthorizedResponse } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const isAuthorized = await validateHermesApiKey(req);
  if (!isAuthorized) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { productId, title, type = 'SINGLE', hookAngle, posts, metadata } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Draft title is required' },
        { status: 400 }
      );
    }

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one post item in posts array is required' },
        { status: 400 }
      );
    }

    let serializedMetadata: string | null = null;
    if (metadata) {
      serializedMetadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    }

    const postCreates = posts.map((item: any, index: number) => ({
      orderIndex: typeof item.orderIndex === 'number' ? item.orderIndex : index,
      content: item.content || '',
      mediaUrl: item.mediaUrl || null,
    }));

    const draft = await prisma.contentDraft.create({
      data: {
        productId: productId || null,
        title: title.trim(),
        type: type === 'THREAD_CHAIN' ? 'THREAD_CHAIN' : 'SINGLE',
        status: 'PENDING_REVIEW', // Strict review requirement
        source: 'HERMES_AI',
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

    return NextResponse.json(
      {
        success: true,
        draft,
        data: draft,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/hermes/drafts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating draft' },
      { status: 500 }
    );
  }
}
