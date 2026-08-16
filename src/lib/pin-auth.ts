import crypto from 'crypto';
import { prisma } from './prisma';

export const DEFAULT_PIN = '123456';
export const SESSION_COOKIE_NAME = 'threads_admin_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

const SECRET_SALT_KEY = process.env.PIN_SECRET_KEY || 'threads-marketing-secret-salt-2026';

export function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt + SECRET_SALT_KEY, 10000, 64, 'sha512').toString('hex');
}

export async function verifyPin(inputPin: string): Promise<boolean> {
  if (!inputPin || !/^\d{6}$/.test(inputPin)) {
    return false;
  }

  try {
    const [hashConfig, saltConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'ADMIN_PIN_HASH' } }),
      prisma.systemConfig.findUnique({ where: { key: 'ADMIN_PIN_SALT' } }),
    ]);

    if (!hashConfig || !saltConfig) {
      // Fallback to DEFAULT_PIN
      return inputPin === DEFAULT_PIN;
    }

    const computedHash = hashPin(inputPin, saltConfig.value);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hashConfig.value, 'hex')
    );
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return inputPin === DEFAULT_PIN;
  }
}

export async function updatePin(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPin || !/^\d{6}$/.test(newPin)) {
    return { success: false, error: 'PIN baru harus berupa 6 digit angka.' };
  }

  const isCurrentValid = await verifyPin(currentPin);
  if (!isCurrentValid) {
    return { success: false, error: 'PIN saat ini salah.' };
  }

  try {
    const newSalt = crypto.randomBytes(32).toString('hex');
    const newHash = hashPin(newPin, newSalt);

    await prisma.$transaction([
      prisma.systemConfig.upsert({
        where: { key: 'ADMIN_PIN_HASH' },
        update: { value: newHash },
        create: {
          key: 'ADMIN_PIN_HASH',
          value: newHash,
          description: 'Hashed admin dashboard 6-digit PIN',
        },
      }),
      prisma.systemConfig.upsert({
        where: { key: 'ADMIN_PIN_SALT' },
        update: { value: newSalt },
        create: {
          key: 'ADMIN_PIN_SALT',
          value: newSalt,
          description: 'Salt for admin dashboard PIN',
        },
      }),
    ]);

    return { success: true };
  } catch (error: any) {
    console.error('Error updating PIN in database:', error);
    return { success: false, error: error?.message || 'Gagal menyimpan PIN baru ke database.' };
  }
}

export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `admin:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', SECRET_SALT_KEY)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifySessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [role, expiresAtStr, signature] = parts;
    if (role !== 'admin') return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Expired
    }

    const payload = `${role}:${expiresAtStr}`;
    const expectedSig = crypto
      .createHmac('sha256', SECRET_SALT_KEY)
      .update(payload)
      .digest('hex');

    if (signature.length !== expectedSig.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch {
    return false;
  }
}
