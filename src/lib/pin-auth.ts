import crypto from 'crypto';
import { prisma } from './prisma';
import { DEFAULT_PIN } from './session';

export {
  DEFAULT_PIN,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from './session';

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
    const computedBuf = Buffer.from(computedHash, 'hex');
    const storedBuf = Buffer.from(hashConfig.value, 'hex');

    if (computedBuf.length !== storedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuf, storedBuf);
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
