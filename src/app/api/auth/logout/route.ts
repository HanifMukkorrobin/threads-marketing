import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Sesi berhasil diakhiri.',
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
