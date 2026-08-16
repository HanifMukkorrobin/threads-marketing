import { NextRequest, NextResponse } from 'next/server';
import { verifyPin, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN harus berupa 6 digit angka.' },
        { status: 400 }
      );
    }

    const isValid = await verifyPin(pin);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'PIN yang dimasukkan salah.' },
        { status: 401 }
      );
    }

    const sessionToken = createSessionToken();
    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi PIN berhasil.',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: any) {
    console.error('Error in POST /api/auth/pin:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server saat memproses login.' },
      { status: 500 }
    );
  }
}
