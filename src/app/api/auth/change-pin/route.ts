import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, updatePin, SESSION_COOKIE_NAME } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME);
    const token = cookie?.value;
    if (!token || !verifySessionToken(token)) {
      return NextResponse.json(
        { success: false, error: 'Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { currentPin, newPin, confirmPin } = body;

    if (!currentPin || typeof currentPin !== 'string') {
      return NextResponse.json(
        { success: false, error: 'PIN saat ini wajib diisi.' },
        { status: 400 }
      );
    }

    if (!newPin || typeof newPin !== 'string' || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, error: 'PIN baru harus berupa 6 digit angka.' },
        { status: 400 }
      );
    }

    if (newPin !== confirmPin) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi PIN baru tidak cocok.' },
        { status: 400 }
      );
    }

    const result = await updatePin(currentPin, newPin);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Gagal mengubah PIN.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'PIN berhasil diperbarui.',
    });
  } catch (err: any) {
    console.error('Error in POST /api/auth/change-pin:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server saat mengubah PIN.' },
      { status: 500 }
    );
  }
}
