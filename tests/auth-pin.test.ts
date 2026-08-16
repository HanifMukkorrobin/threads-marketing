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
import { POST as pinLoginHandler } from '@/app/api/auth/pin/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { GET as statusHandler } from '@/app/api/auth/status/route';
import { POST as changePinHandler } from '@/app/api/auth/change-pin/route';
import { NextRequest } from 'next/server';

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

describe('Auth API Routes', () => {
  beforeEach(async () => {
    await prisma.systemConfig.deleteMany({
      where: {
        key: { in: ['ADMIN_PIN_HASH', 'ADMIN_PIN_SALT'] },
      },
    });
  });

  it('POST /api/auth/pin rejects invalid format or wrong PIN', async () => {
    // Missing pin
    const req1 = new NextRequest('http://localhost:3000/api/auth/pin', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res1 = await pinLoginHandler(req1);
    expect(res1.status).toBe(400);

    // Wrong pin
    const req2 = new NextRequest('http://localhost:3000/api/auth/pin', {
      method: 'POST',
      body: JSON.stringify({ pin: '000000' }),
    });
    const res2 = await pinLoginHandler(req2);
    expect(res2.status).toBe(401);
  });

  it('POST /api/auth/pin sets session cookie on correct PIN', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/pin', {
      method: 'POST',
      body: JSON.stringify({ pin: '123456' }),
    });
    const res = await pinLoginHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('threads_admin_session=');
  });

  it('GET /api/auth/status correctly detects valid vs missing session', async () => {
    // Unauthenticated
    const reqNoCookie = new NextRequest('http://localhost:3000/api/auth/status');
    const resNoCookie = await statusHandler(reqNoCookie);
    const dataNoCookie = await resNoCookie.json();
    expect(dataNoCookie.authenticated).toBe(false);

    // Authenticated
    const token = createSessionToken();
    const reqWithCookie = new NextRequest('http://localhost:3000/api/auth/status', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const resWithCookie = await statusHandler(reqWithCookie);
    const dataWithCookie = await resWithCookie.json();
    expect(dataWithCookie.authenticated).toBe(true);
  });

  it('POST /api/auth/change-pin requires valid session and updates PIN', async () => {
    const token = createSessionToken();

    // Unauthorized without session
    const reqNoAuth = new NextRequest('http://localhost:3000/api/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({
        currentPin: '123456',
        newPin: '998877',
        confirmPin: '998877',
      }),
    });
    const resNoAuth = await changePinHandler(reqNoAuth);
    expect(resNoAuth.status).toBe(401);

    // With valid session and valid PINs
    const req = new NextRequest('http://localhost:3000/api/auth/change-pin', {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        currentPin: '123456',
        newPin: '998877',
        confirmPin: '998877',
      }),
    });
    const res = await changePinHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify new PIN can log in
    const loginReq = new NextRequest('http://localhost:3000/api/auth/pin', {
      method: 'POST',
      body: JSON.stringify({ pin: '998877' }),
    });
    const loginRes = await pinLoginHandler(loginReq);
    expect(loginRes.status).toBe(200);
  });

  it('POST /api/auth/change-pin validates input fields and errors', async () => {
    const token = createSessionToken();

    // Missing currentPin
    const req1 = new NextRequest('http://localhost:3000/api/auth/change-pin', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      body: JSON.stringify({ newPin: '112233', confirmPin: '112233' }),
    });
    const res1 = await changePinHandler(req1);
    expect(res1.status).toBe(400);
    const data1 = await res1.json();
    expect(data1.error).toContain('PIN saat ini wajib diisi');

    // Invalid newPin format
    const req2 = new NextRequest('http://localhost:3000/api/auth/change-pin', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      body: JSON.stringify({ currentPin: '123456', newPin: '12345', confirmPin: '12345' }),
    });
    const res2 = await changePinHandler(req2);
    expect(res2.status).toBe(400);
    const data2 = await res2.json();
    expect(data2.error).toContain('PIN baru harus berupa 6 digit angka');

    // Confirm PIN mismatch
    const req3 = new NextRequest('http://localhost:3000/api/auth/change-pin', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      body: JSON.stringify({ currentPin: '123456', newPin: '112233', confirmPin: '112244' }),
    });
    const res3 = await changePinHandler(req3);
    expect(res3.status).toBe(400);
    const data3 = await res3.json();
    expect(data3.error).toContain('Konfirmasi PIN baru tidak cocok');

    // Wrong current PIN
    const req4 = new NextRequest('http://localhost:3000/api/auth/change-pin', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      body: JSON.stringify({ currentPin: '000000', newPin: '112233', confirmPin: '112233' }),
    });
    const res4 = await changePinHandler(req4);
    expect(res4.status).toBe(400);
    const data4 = await res4.json();
    expect(data4.error).toContain('PIN saat ini salah');
  });

  it('POST /api/auth/logout clears the session cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    });
    const res = await logoutHandler(req);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('threads_admin_session=;');
  });
});

describe('Next.js Route Protection Middleware', () => {
  it('allows public routes (/login, /api/auth/pin, /api/auth/status, /api/hermes/*, static assets) without session', async () => {
    const { middleware } = await import('@/middleware');
    const publicPaths = [
      'http://localhost:3000/login',
      'http://localhost:3000/api/auth/pin',
      'http://localhost:3000/api/auth/status',
      'http://localhost:3000/api/hermes/products/active',
      'http://localhost:3000/api/hermes/drafts/approved',
      'http://localhost:3000/_next/static/chunk.js',
      'http://localhost:3000/favicon.ico',
    ];

    for (const url of publicPaths) {
      const req = new NextRequest(url);
      const res = await middleware(req);
      // Public route returns Next or pass-through, not redirect 307 or 401
      expect(res.status).toBe(200);
    }
  });

  it('redirects unauthenticated web requests to /login', async () => {
    const { middleware } = await import('@/middleware');
    const protectedWebPaths = [
      'http://localhost:3000/',
      'http://localhost:3000/products',
      'http://localhost:3000/drafts',
      'http://localhost:3000/settings',
    ];

    for (const url of protectedWebPaths) {
      const req = new NextRequest(url);
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login');
    }
  });

  it('returns 401 JSON for unauthenticated internal API routes', async () => {
    const { middleware } = await import('@/middleware');
    const protectedApiPaths = [
      'http://localhost:3000/api/products',
      'http://localhost:3000/api/drafts',
      'http://localhost:3000/api/settings',
      'http://localhost:3000/api/overview',
    ];

    for (const url of protectedApiPaths) {
      const req = new NextRequest(url);
      const res = await middleware(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized: Sesi login diperlukan');
    }
  });

  it('allows authenticated web requests and internal API requests through', async () => {
    const { middleware } = await import('@/middleware');
    const token = createSessionToken();

    const reqWeb = new NextRequest('http://localhost:3000/products', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const resWeb = await middleware(reqWeb);
    expect(resWeb.status).toBe(200);

    const reqApi = new NextRequest('http://localhost:3000/api/products', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const resApi = await middleware(reqApi);
    expect(resApi.status).toBe(200);
  });

  it('redirects authenticated user from /login to /', async () => {
    const { middleware } = await import('@/middleware');
    const token = createSessionToken();
    const req = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });
});

