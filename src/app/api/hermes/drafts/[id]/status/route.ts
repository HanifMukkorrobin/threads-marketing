import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateHermesApiKey, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAuthorized = await validateHermesApiKey(req);
  if (!isAuthorized) {
    return unauthorizedResponse();
  }

  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, threadPostId, threadPostUrl, errorMessage } = body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const existingDraft = await prisma.contentDraft.findUnique({
      where: { id },
    });

    if (!existingDraft) {
      return NextResponse.json(
        { success: false, error: `ContentDraft with ID ${id} not found` },
        { status: 404 }
      );
    }

    const updateData: {
      status: string;
      publishedAt?: Date;
      threadPostId?: string | null;
      threadPostUrl?: string | null;
      errorMessage?: string | null;
    } = { status };

    if (status === 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    if (threadPostId !== undefined) {
      updateData.threadPostId = threadPostId ? String(threadPostId) : null;
    }
    if (threadPostUrl !== undefined) {
      updateData.threadPostUrl = threadPostUrl ? String(threadPostUrl) : null;
    }
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage ? String(errorMessage) : null;
    }

    const updatedDraft = await prisma.contentDraft.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
      data: updatedDraft,
    });
  } catch (error) {
    console.error('Error in PATCH /api/hermes/drafts/[id]/status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating draft status' },
      { status: 500 }
    );
  }
}
