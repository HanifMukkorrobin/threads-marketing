import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';

export async function validateHermesApiKey(req: NextRequest | Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');

  let key = '';
  if (authHeader?.startsWith('Bearer ') || authHeader?.startsWith('bearer ')) {
    key = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    key = apiKeyHeader.trim();
  } else if (authHeader) {
    key = authHeader.trim();
  }

  if (!key) return false;

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'HERMES_API_KEY' },
    });

    const validKey = config?.value || process.env.HERMES_API_KEY || 'hermes-secret-key-2026';
    return key === validKey;
  } catch (err) {
    console.error('Error checking Hermes API key from database:', err);
    const fallbackKey = process.env.HERMES_API_KEY || 'hermes-secret-key-2026';
    return key === fallbackKey;
  }
}

export function unauthorizedResponse(message = 'Unauthorized: Invalid or missing Hermes API Key') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}
