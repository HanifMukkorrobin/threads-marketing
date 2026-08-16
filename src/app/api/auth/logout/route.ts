import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Sesi berhasil diakhiri.',
  });

  const isSecure = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:' || process.env.COOKIE_SECURE === 'true';

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
