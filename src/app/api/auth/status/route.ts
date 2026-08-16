import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  const token = cookie?.value;
  const isAuthenticated = token ? await verifySessionToken(token) : false;

  return NextResponse.json({
    success: true,
    authenticated: isAuthenticated,
  });
}
