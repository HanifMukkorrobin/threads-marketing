import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateHermesApiKey, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const isAuthorized = await validateHermesApiKey(req);
  if (!isAuthorized) {
    return unauthorizedResponse();
  }

  try {
    const now = new Date();
    const drafts = await prisma.contentDraft.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: drafts.length,
      drafts,
      data: drafts,
    });
  } catch (error) {
    console.error('Error in GET /api/hermes/drafts/approved:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching approved drafts' },
      { status: 500 }
    );
  }
}
