import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const DEFAULT_SETTINGS: Record<string, string> = {
  HERMES_API_KEY: 'hermes-secret-key-2026',
  STORE_NAME: 'Digital Store ID',
  STORE_USERNAME: 'tokodigital.id',
  STORE_AVATAR_URL: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  DEFAULT_SCHEDULE_DELAY_MINS: '30',
};

export async function GET() {
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
