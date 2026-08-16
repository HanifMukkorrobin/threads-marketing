export const DEFAULT_PIN = '123456';
export const SESSION_COOKIE_NAME = 'threads_admin_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

const SECRET_SALT_KEY = process.env.PIN_SECRET_KEY || 'threads-marketing-secret-salt-2026';
const encoder = new TextEncoder();

export async function createSessionToken(secret: string = SECRET_SALT_KEY): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `admin:${expiresAt}`;

  const cryptoSubtle = globalThis.crypto?.subtle;
  if (!cryptoSubtle) {
    throw new Error('Web Crypto API is not available');
  }

  const key = await cryptoSubtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await cryptoSubtle.sign('HMAC', key, encoder.encode(payload));
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const fullPayload = `${payload}:${signatureHex}`;

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(fullPayload, 'utf-8').toString('base64url');
  }

  // Fallback for pure Edge/Browser without Buffer
  const base64 = btoa(fullPayload);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function verifySessionToken(
  token: string,
  secret: string = SECRET_SALT_KEY
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  try {
    let decoded = '';
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(token, 'base64url').toString('utf-8');
    } else {
      const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
      decoded = atob(padded);
    }

    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [role, expiresAtStr, signature] = parts;
    if (role !== 'admin') return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Expired
    }

    const payload = `${role}:${expiresAtStr}`;
    const cryptoSubtle = globalThis.crypto?.subtle;
    if (!cryptoSubtle) {
      return false;
    }

    const key = await cryptoSubtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigHexMatches = signature.match(/.{1,2}/g);
    if (!sigHexMatches) return false;
    const sigBytes = new Uint8Array(sigHexMatches.map((byte) => parseInt(byte, 16)));

    return await cryptoSubtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
  } catch (err) {
    console.error('[verifySessionToken] Error verifying token:', err);
    return false;
  }
}
