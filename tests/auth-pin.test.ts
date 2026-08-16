import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  hashPin,
  verifyPin,
  updatePin,
  createSessionToken,
  verifySessionToken,
  DEFAULT_PIN,
  SESSION_COOKIE_NAME,
} from '@/lib/pin-auth';

describe('PIN Auth Security Utility', () => {
  beforeEach(async () => {
    // Clear system config keys related to PIN before each test
    await prisma.systemConfig.deleteMany({
      where: {
        key: { in: ['ADMIN_PIN_HASH', 'ADMIN_PIN_SALT'] },
      },
    });
  });

  it('verifies default PIN 123456 when database has no stored PIN', async () => {
    const isDefaultValid = await verifyPin(DEFAULT_PIN);
    expect(isDefaultValid).toBe(true);

    const isWrongValid = await verifyPin('999999');
    expect(isWrongValid).toBe(false);
  });

  it('hashes pin consistently with identical salt', () => {
    const salt = 'random-salt-123456';
    const hash1 = hashPin('123456', salt);
    const hash2 = hashPin('123456', salt);
    const hash3 = hashPin('654321', salt);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBeGreaterThanOrEqual(64);
  });

  it('updates pin successfully with valid current pin and valid 6-digit new pin', async () => {
    const result = await updatePin('123456', '888999');
    expect(result.success).toBe(true);

    // Old pin should now fail
    const oldValid = await verifyPin('123456');
    expect(oldValid).toBe(false);

    // New pin should now succeed
    const newValid = await verifyPin('888999');
    expect(newValid).toBe(true);
  });

  it('rejects updatePin when current pin is wrong', async () => {
    const result = await updatePin('000000', '888999');
    expect(result.success).toBe(false);
    expect(result.error).toContain('PIN saat ini salah');
  });

  it('rejects updatePin when new pin is not 6 digits or non-numeric', async () => {
    const invalidFormats = ['12345', '1234567', 'abcdef', '12345a', ''];
    for (const invalid of invalidFormats) {
      const result = await updatePin('123456', invalid);
      expect(result.success).toBe(false);
    }
  });

  it('generates and validates session token', () => {
    const token = createSessionToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const isValid = verifySessionToken(token);
    expect(isValid).toBe(true);

    const isTamperedValid = verifySessionToken(token + 'tampered');
    expect(isTamperedValid).toBe(false);

    const isBogusValid = verifySessionToken('invalid.token.here');
    expect(isBogusValid).toBe(false);
  });
});
