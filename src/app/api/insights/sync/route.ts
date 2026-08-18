import { NextRequest, NextResponse } from 'next/server';
import { syncThreadsMetricsFromMeta } from '@/lib/threads-insights';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request | NextRequest) {
  try {
    let body: { token?: string; userId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is valid
    }

    const result = await syncThreadsMetricsFromMeta(body.token, body.userId);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      isLiveSynced: result.isLive,
      syncedDays: result.syncedDays,
    });
  } catch (err: any) {
    console.error('Error in POST /api/insights/sync:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyinkronkan metrik Threads' },
      { status: 500 }
    );
  }
}
