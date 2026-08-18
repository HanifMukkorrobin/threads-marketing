import { NextRequest, NextResponse } from 'next/server';
import { getThreadsInsights } from '@/lib/threads-insights';
import { InsightRange } from '@/types/insights';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request | NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get('range') || '7d';
    const range: InsightRange = ['7d', '14d', '30d'].includes(rangeParam)
      ? (rangeParam as InsightRange)
      : '7d';

    const data = await getThreadsInsights(range);

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('Error in GET /api/insights:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat insight performa Threads' },
      { status: 500 }
    );
  }
}
