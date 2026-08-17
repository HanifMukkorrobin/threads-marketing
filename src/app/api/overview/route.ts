import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDraft } from '@/lib/drafts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [
      totalProducts,
      activeProducts,
      pendingDrafts,
      approvedDrafts,
      scheduledDrafts,
      publishedDrafts,
      failedDrafts,
      totalDrafts,
      recentPendingDraftsRaw,
      recentPublishedDraftsRaw,
      apiKeyConfig,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.contentDraft.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.contentDraft.count({ where: { status: 'APPROVED' } }),
      prisma.contentDraft.count({ where: { status: 'SCHEDULED' } }),
      prisma.contentDraft.count({ where: { status: 'PUBLISHED' } }),
      prisma.contentDraft.count({ where: { status: 'FAILED' } }),
      prisma.contentDraft.count(),
      prisma.contentDraft.findMany({
        where: { status: 'PENDING_REVIEW' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          product: true,
          posts: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
      prisma.contentDraft.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 10,
        include: {
          product: true,
          posts: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
      prisma.systemConfig.findUnique({
        where: { key: 'HERMES_API_KEY' },
      }),
    ]);

    const recentPendingDrafts = recentPendingDraftsRaw.map(formatDraft);
    const recentPublishedDrafts = recentPublishedDraftsRaw.map(formatDraft);

    const apiKey = apiKeyConfig?.value || process.env.HERMES_API_KEY || 'hermes-secret-key-2026';

    return NextResponse.json(
      {
        success: true,
        counts: {
          totalProducts,
          activeProducts,
          pendingDrafts,
          approvedDrafts,
          scheduledDrafts,
          publishedDrafts,
          failedDrafts,
          totalDrafts,
        },
        recentPendingDrafts,
        recentPublishedDrafts,
        hermesStatus: {
          isConfigured: Boolean(apiKey),
          hasApiKey: Boolean(apiKey),
          apiKeyPreview: apiKey ? `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}` : null,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching dashboard overview data:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat data overview dashboard' },
      { status: 500 }
    );
  }
}
