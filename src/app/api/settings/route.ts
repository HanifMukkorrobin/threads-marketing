import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SETTINGS: Record<string, string> = {
  HERMES_API_KEY: 'hermes-secret-key-2026',
  STORE_NAME: 'Digital Store ID',
  STORE_USERNAME: 'tokodigital.id',
  STORE_AVATAR_URL: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  DEFAULT_SCHEDULE_DELAY_MINS: '30',
  THREADS_ACCESS_TOKEN: '',
  THREADS_USER_ID: '',
};

export async function GET(req: Request | NextRequest) {
  try {
    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = { ...DEFAULT_SETTINGS };

    for (const item of configs) {
      configMap[item.key] = item.value;
    }

    return NextResponse.json({
      success: true,
      settings: configMap,
    });
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat konfigurasi sistem' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest | Request) {
  try {
    const body = await req.json();
    const settingsToUpdate = body.settings || body;

    if (!settingsToUpdate || typeof settingsToUpdate !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Payload pengaturan tidak valid' },
        { status: 400 }
      );
    }

    const entries = Object.entries(settingsToUpdate);
    const updatedEntries: Record<string, string> = {};

    for (const [key, value] of entries) {
      if (typeof key === 'string' && value !== undefined && value !== null) {
        const stringVal = String(value);
        await prisma.systemConfig.upsert({
          where: { key },
          update: { value: stringVal },
          create: {
            key,
            value: stringVal,
            description: `Auto-managed config for ${key}`,
          },
        });
        updatedEntries[key] = stringVal;
      }
    }

    // Return all latest merged settings
    const allConfigs = await prisma.systemConfig.findMany();
    const fullConfigMap: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const item of allConfigs) {
      fullConfigMap[item.key] = item.value;
    }

    return NextResponse.json({
      success: true,
      settings: fullConfigMap,
    });
  } catch (err: any) {
    console.error('Error updating settings:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan pengaturan' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest | Request) {
  try {
    const body = await req.json();

    if (body.action === 'regenerate-key') {
      const randomPart = crypto.randomBytes(16).toString('hex');
      const newApiKey = `hermes_${randomPart}`;

      await prisma.systemConfig.upsert({
        where: { key: 'HERMES_API_KEY' },
        update: { value: newApiKey },
        create: {
          key: 'HERMES_API_KEY',
          value: newApiKey,
          description: 'Hermes Agent secret API authentication key',
        },
      });

      return NextResponse.json({
        success: true,
        apiKey: newApiKey,
        message: 'API Key Hermes berhasil diperbarui',
      });
    }

    if (body.action === 'verify-threads-token') {
      const token =
        body.token ||
        (await prisma.systemConfig.findUnique({ where: { key: 'THREADS_ACCESS_TOKEN' } }))?.value;

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'THREADS_ACCESS_TOKEN belum diisi' },
          { status: 400 }
        );
      }

      try {
        const url = `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${encodeURIComponent(
          token
        )}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || data.error) {
          const errText = data.error?.message || data.error || 'Token Threads tidak valid';
          return NextResponse.json({ success: false, error: errText }, { status: 400 });
        }

        // Update STORE_USERNAME and THREADS_USER_ID if available
        if (data.username) {
          await prisma.systemConfig.upsert({
            where: { key: 'STORE_USERNAME' },
            update: { value: data.username },
            create: { key: 'STORE_USERNAME', value: data.username, description: 'Store Threads Username' },
          });
        }
        if (data.id) {
          await prisma.systemConfig.upsert({
            where: { key: 'THREADS_USER_ID' },
            update: { value: data.id },
            create: { key: 'THREADS_USER_ID', value: data.id, description: 'Threads User ID' },
          });
        }
        if (data.threads_profile_picture_url) {
          await prisma.systemConfig.upsert({
            where: { key: 'STORE_AVATAR_URL' },
            update: { value: data.threads_profile_picture_url },
            create: { key: 'STORE_AVATAR_URL', value: data.threads_profile_picture_url, description: 'Store Avatar URL' },
          });
        }

        return NextResponse.json({
          success: true,
          account: data,
          message: `Berhasil terhubung ke akun @${data.username} (${data.name || data.id})`,
        });
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: `Gagal verifikasi token: ${err.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: `Action '${body.action}' tidak dikenal` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error processing settings action:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memproses aksi pengaturan' },
      { status: 500 }
    );
  }
}
