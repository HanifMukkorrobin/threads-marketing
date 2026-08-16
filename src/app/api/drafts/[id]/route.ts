import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDraft, isValidDraftStatus } from '@/lib/drafts';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const rawDraft = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!rawDraft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    const draft = formatDraft(rawDraft);

    return NextResponse.json({
      success: true,
      draft,
      data: draft,
    });
  } catch (error) {
    console.error(`Error in GET /api/drafts/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching draft' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.contentDraft.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      title,
      productId,
      type,
      status,
      hookAngle,
      scheduledAt,
      publishedAt,
      threadPostId,
      threadPostUrl,
      errorMessage,
      source,
      metadata,
      posts,
    } = body;

    if (status && !isValidDraftStatus(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status '${status}'` },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = String(title).trim();
    if (productId !== undefined) updateData.productId = productId || null;
    if (hookAngle !== undefined) updateData.hookAngle = hookAngle ? String(hookAngle).trim() : null;
    if (status !== undefined) updateData.status = status;
    if (source !== undefined) updateData.source = source;
    if (threadPostId !== undefined) updateData.threadPostId = threadPostId;
    if (threadPostUrl !== undefined) updateData.threadPostUrl = threadPostUrl;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    }
    if (metadata !== undefined) {
      updateData.metadata = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    }

    if (type !== undefined) {
      updateData.type = type;
    } else if (Array.isArray(posts)) {
      updateData.type = posts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE';
    }

    // Execute in transaction if posts are being replaced
    if (Array.isArray(posts)) {
      await prisma.$transaction(async (tx) => {
        await tx.draftPostItem.deleteMany({
          where: { draftId: id },
        });

        const postCreates = posts.map((p: any, idx: number) => ({
          draftId: id,
          orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : idx,
          content: p.content ? String(p.content) : '',
          mediaUrl: p.mediaUrl ? String(p.mediaUrl).trim() : null,
        }));

        if (postCreates.length > 0) {
          await tx.draftPostItem.createMany({
            data: postCreates,
          });
        }

        await tx.contentDraft.update({
          where: { id },
          data: updateData,
        });
      });
    } else {
      await prisma.contentDraft.update({
        where: { id },
        data: updateData,
      });
    }

    const updated = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const formatted = formatDraft(updated);

    return NextResponse.json({
      success: true,
      draft: formatted,
      data: formatted,
    });
  } catch (error) {
    console.error(`Error in PUT /api/drafts/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating draft' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.contentDraft.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      status,
      threadPostId,
      threadPostUrl,
      errorMessage,
      publishedAt,
      scheduledAt,
    } = body;

    const updateData: any = {};

    if (status !== undefined) {
      if (!isValidDraftStatus(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status '${status}'` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (threadPostId !== undefined) updateData.threadPostId = threadPostId;
    if (threadPostUrl !== undefined) updateData.threadPostUrl = threadPostUrl;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    }
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    const updated = await prisma.contentDraft.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const formatted = formatDraft(updated);

    return NextResponse.json({
      success: true,
      draft: formatted,
      data: formatted,
    });
  } catch (error) {
    console.error(`Error in PATCH /api/drafts/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating draft status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.contentDraft.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    await prisma.contentDraft.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
      id,
    });
  } catch (error) {
    console.error(`Error in DELETE /api/drafts/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while deleting draft' },
      { status: 500 }
    );
  }
}
