import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDraft, isValidDraftStatus } from '@/lib/drafts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const draft = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    const formatted = formatDraft(draft);

    return NextResponse.json({
      success: true,
      id: draft.id,
      status: draft.status,
      publishedAt: draft.publishedAt,
      threadPostId: draft.threadPostId,
      threadPostUrl: draft.threadPostUrl,
      draft: formatted,
      data: formatted,
    });
  } catch (error) {
    console.error(`Error in GET /api/drafts/${params.id}/status:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching draft status' },
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

    if (status === 'PUBLISHED' && publishedAt === undefined && !existing.publishedAt) {
      updateData.publishedAt = new Date();
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
    console.error(`Error in PATCH /api/drafts/${params.id}/status:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating draft status' },
      { status: 500 }
    );
  }
}
