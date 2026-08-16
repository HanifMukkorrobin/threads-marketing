# 6-Digit PIN Authentication & Security Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 6-digit numeric PIN authentication system with session management via httpOnly cookies, Next.js route middleware protection, a dedicated login page with interactive PIN pad, a PIN management card in the settings page, and complete isolation for Hermes API routes.

**Architecture:** Server-side PBKDF2/crypto hashing for the 6-digit PIN stored in `SystemConfig`, signed HMAC session cookies (`threads_admin_session`) with 7-day validity, Next.js `middleware.ts` guarding dashboard pages and internal APIs with automatic redirection or 401 response, and dedicated API routes for authentication and PIN updates.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS, Lucide Icons, Prisma ORM with SQLite, Node.js `crypto`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-16-pin-auth-design.md`

## Global Constraints
- Default PIN if unset: `123456`.
- PIN format constraint: Exactly 6 numeric digits (`/^\d{6}$/`).
- Session cookie name: `threads_admin_session`.
- Session expiration: 7 days (`604800` seconds).
- Hermes API (`/api/hermes/*`) must NOT require PIN cookies and MUST continue using Bearer API Key validation.
- Database isolation: Vitest tests run against `test.db` (configured via `vitest.config.ts`), PM2 production runs against `prod.db`.

---

### Task 1: PIN Security Utilities (`src/lib/pin-auth.ts`) & Core Unit Tests

**Files:**
- Create: `src/lib/pin-auth.ts`
- Create: `tests/auth-pin.test.ts`

**Interfaces:**
- Produces:
  - `hashPin(pin: string, salt: string): string`
  - `verifyPin(inputPin: string): Promise<boolean>`
  - `updatePin(currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }>`
  - `createSessionToken(): string`
  - `verifySessionToken(token: string): boolean`
  - `SESSION_COOKIE_NAME: string`
  - `DEFAULT_PIN: string`

- [ ] **Step 1: Write the failing unit tests for PIN auth core utilities**

Write `tests/auth-pin.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth-pin.test.ts`
Expected: FAIL with "Cannot find module '@/lib/pin-auth'"

- [ ] **Step 3: Implement `src/lib/pin-auth.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/auth-pin.test.ts`
Expected: PASS with all unit test cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pin-auth.ts tests/auth-pin.test.ts
git commit -m "feat(auth): implement 6-digit PIN hashing and session utilities"
```

---

### Task 2: Auth API Routes (`/api/auth/pin`, `/api/auth/logout`, `/api/auth/status`, `/api/auth/change-pin`)

**Files:**
- Create: `src/app/api/auth/pin/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/status/route.ts`
- Create: `src/app/api/auth/change-pin/route.ts`
- Modify: `tests/auth-pin.test.ts` (add API route test suite)

**Interfaces:**
- Consumes: `src/lib/pin-auth.ts`
- Produces:
  - `POST /api/auth/pin`: Verifies PIN, sets `threads_admin_session` cookie
  - `POST /api/auth/logout`: Clears `threads_admin_session` cookie
  - `GET /api/auth/status`: Returns `{ success: true, authenticated: boolean }`
  - `POST /api/auth/change-pin`: Updates PIN with verification

- [ ] **Step 1: Write integration tests for API routes in `tests/auth-pin.test.ts`**

Append to `tests/auth-pin.test.ts`:
```typescript
import { POST as pinLoginHandler } from '@/app/api/auth/pin/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { GET as statusHandler } from '@/app/api/auth/status/route';
import { POST as changePinHandler } from '@/app/api/auth/change-pin/route';
import { NextRequest } from 'next/server';

describe('Auth API Routes', () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth-pin.test.ts`
Expected: FAIL due to missing route files.

- [ ] **Step 3: Implement API Route Handlers**

1. `src/app/api/auth/pin/route.ts`:
```typescript
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
```

2. `src/app/api/auth/logout/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Sesi berhasil diakhiri.',
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
```

3. `src/app/api/auth/status/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/pin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  const token = cookie?.value;
  const isAuthenticated = token ? verifySessionToken(token) : false;

  return NextResponse.json({
    success: true,
    authenticated: isAuthenticated,
  });
}
```

4. `src/app/api/auth/change-pin/route.ts`:
```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/auth-pin.test.ts`
Expected: PASS for all unit and route tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth tests/auth-pin.test.ts
git commit -m "feat(api): add auth API routes for login, logout, status, and pin change"
```

---

### Task 3: Next.js Route Protection Middleware (`src/middleware.ts`)

**Files:**
- Create: `src/middleware.ts`
- Modify: `tests/auth-pin.test.ts` (add middleware behavior tests)

**Interfaces:**
- Consumes: `src/lib/pin-auth.ts`
- Produces: Edge/Node compatible middleware that protects dashboard pages and internal APIs while keeping `/api/hermes/*`, `/login`, and assets public.

- [ ] **Step 1: Write tests for Middleware logic in `tests/auth-pin.test.ts`**

Append to `tests/auth-pin.test.ts`:
```typescript
import { middleware } from '@/middleware';

describe('Next.js Route Protection Middleware', () => {
  it('allows public routes (/login, /api/auth/pin, /api/hermes/*, static assets) without session', async () => {
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
      // Public route returns Next or null/pass-through, not redirect 307
      expect(res.status).toBe(200);
    }
  });

  it('redirects unauthenticated web requests to /login', async () => {
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

  it('allows authenticated web requests through', async () => {
    const token = createSessionToken();
    const req = new NextRequest('http://localhost:3000/products', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects authenticated user from /login to /', async () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth-pin.test.ts`
Expected: FAIL due to missing `src/middleware.ts`.

- [ ] **Step 3: Implement `src/middleware.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/pin-auth';

// Paths that never require PIN authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/pin',
  '/api/auth/status',
  '/favicon.ico',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow static files & Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Always allow Hermes Autonomous Agent APIs (auth handled by Bearer token validator)
  if (pathname.startsWith('/api/hermes')) {
    return NextResponse.next();
  }

  // 3. Check session cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = sessionCookie ? verifySessionToken(sessionCookie) : false;

  // 4. If already authenticated and trying to visit /login, redirect to /
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 5. Allow other public auth routes
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 6. Protected routes: Check auth
  if (!isAuthenticated) {
    // If it's an API route (other than hermes/public), return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi login diperlukan' },
        { status: 401 }
      );
    }

    // If it's a web page, redirect to /login with return URL
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/auth-pin.test.ts`
Expected: PASS for all tests including middleware.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts tests/auth-pin.test.ts
git commit -m "feat(middleware): add route protection middleware for dashboard & internal APIs"
```

---

### Task 4: Interactive Login Screen UI (`/login`) & Navbar Lock Button

**Files:**
- Create: `src/app/login/page.tsx`
- Modify: `src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/pin`, `POST /api/auth/logout`
- Produces:
  - Responsive 6-digit PIN input with auto-advance, discrete boxes, backspace/paste support, virtual on-screen keypad, show/hide toggle, and shake animation.
  - Navbar Lock/Logout button in header.

- [ ] **Step 1: Implement `src/app/login/page.tsx`**

```tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Sparkles, Eye, EyeOff, Delete, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const numericChar = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = numericChar;
    setDigits(newDigits);

    if (numericChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (numericChar && index === 5) {
      const fullPin = newDigits.join('');
      if (fullPin.length === 6) {
        submitPin(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === 6) {
      submitPin(pasted);
    }
  };

  const handleKeypadPress = (val: string) => {
    setError(null);
    if (val === 'backspace') {
      // Find last filled index
      const lastIndex = digits.map((d, i) => (d ? i : -1)).filter((i) => i !== -1).pop();
      if (lastIndex !== undefined) {
        const newDigits = [...digits];
        newDigits[lastIndex] = '';
        setDigits(newDigits);
        inputRefs.current[lastIndex]?.focus();
      }
      return;
    }

    if (val === 'clear') {
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    // Find first empty index
    const emptyIndex = digits.findIndex((d) => !d);
    if (emptyIndex !== -1) {
      const newDigits = [...digits];
      newDigits[emptyIndex] = val;
      setDigits(newDigits);

      if (emptyIndex < 5) {
        inputRefs.current[emptyIndex + 1]?.focus();
      } else if (emptyIndex === 5) {
        const fullPin = newDigits.join('');
        submitPin(fullPin);
      }
    }
  };

  const submitPin = async (pinToSubmit?: string) => {
    const pin = pinToSubmit || digits.join('');
    if (pin.length !== 6) {
      setError('Masukkan 6 digit PIN secara lengkap');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setError(data.error || 'PIN yang Anda masukkan salah.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Success -> Redirect
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] flex flex-col items-center justify-center px-4 py-12 select-none">
      <div
        className={cn(
          'w-full max-w-sm rounded-3xl border border-zinc-800 bg-[#161616] p-8 shadow-2xl transition-all duration-300',
          isShaking && 'animate-shake'
        )}
      >
        {/* Brand / Logo */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20 text-white">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <span>Threads Engine</span>
              <Sparkles className="h-4 w-4 text-sky-400" />
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Masukkan 6 digit PIN untuk mengakses dashboard
            </p>
          </div>
        </div>

        {/* 6 Discrete Digit Boxes */}
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-2">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={loading}
                className={cn(
                  'h-12 w-11 text-center font-mono text-lg font-bold rounded-xl border bg-[#101010] transition-all duration-150 focus:outline-none',
                  digit
                    ? 'border-sky-500 text-white shadow-sm shadow-sky-500/20'
                    : 'border-zinc-800 text-zinc-400 focus:border-sky-500/80',
                  error && 'border-rose-500/80 text-rose-300'
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{showPin ? 'Sembunyikan' : 'Lihat PIN'}</span>
            </button>

            <span className="text-[11px] text-zinc-500">Default: 123456</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-center text-xs text-rose-400 animate-fadeIn">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => submitPin()}
            disabled={loading || digits.join('').length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-black shadow-lg hover:bg-zinc-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            ) : (
              <>
                <span>Buka Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Virtual On-Screen Keypad for touch / mobile */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80">
          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                disabled={loading}
                className="flex h-11 items-center justify-center rounded-xl bg-[#1f1f1f] text-sm font-semibold text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress('clear')}
              disabled={loading}
              className="flex h-11 items-center justify-center rounded-xl bg-[#1f1f1f]/50 text-xs font-medium text-zinc-400 hover:bg-zinc-700/60 active:scale-95 transition-all"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              disabled={loading}
              className="flex h-11 items-center justify-center rounded-xl bg-[#1f1f1f] text-sm font-semibold text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('backspace')}
              disabled={loading}
              className="flex h-11 items-center justify-center rounded-xl bg-[#1f1f1f]/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 active:scale-95 transition-all"
              title="Hapus"
            >
              <Delete className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Session aman terenkripsi 7 hari</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/components/Navbar.tsx` with Lock / Logout button**

Modify `src/components/Navbar.tsx` to add a Lock / Logout button that triggers `POST /api/auth/logout` and navigates to `/login`:
```tsx
// Inside Navbar component:
const handleLogout = async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  } catch (err) {
    window.location.href = '/login';
  }
};
```
Render a sleek `Lock` / `LogOut` icon button in both desktop and mobile header bars.

- [ ] **Step 3: Add shake animation in `src/app/globals.css` if needed**

Ensure `@keyframes shake` is defined in `src/app/globals.css` or Tailwind config.

- [ ] **Step 4: Verify login page renders and compiles cleanly**

Run: `npm run build` or `npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx src/components/Navbar.tsx src/app/globals.css
git commit -m "feat(ui): add 6-digit PIN login screen and Navbar lock/logout button"
```

---

### Task 5: Security & PIN Management Card in Settings Page (`src/app/settings/page.tsx`)

**Files:**
- Modify: `src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/change-pin`
- Produces: Interactive "Keamanan & PIN Akses" card in `/settings` allowing users to change the 6-digit PIN with validation and toast notifications.

- [ ] **Step 1: Implement PIN Change Section in `src/app/settings/page.tsx`**

Add state in `SettingsPage`:
```tsx
const [pinForm, setPinForm] = useState({
  currentPin: '',
  newPin: '',
  confirmPin: '',
});
const [showPinFields, setShowPinFields] = useState(false);
const [changingPin, setChangingPin] = useState(false);
```

Add handler:
```tsx
const handleChangePin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (pinForm.newPin.length !== 6 || !/^\d{6}$/.test(pinForm.newPin)) {
    addToast('PIN baru harus terdiri dari 6 digit angka', 'error');
    return;
  }
  if (pinForm.newPin !== pinForm.confirmPin) {
    addToast('Konfirmasi PIN baru tidak cocok', 'error');
    return;
  }

  try {
    setChangingPin(true);
    const res = await fetch('/api/auth/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pinForm),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal mengubah PIN');
    }

    addToast('PIN Akses Dashboard berhasil diperbarui!', 'success');
    setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
  } catch (err: any) {
    addToast(err?.message || 'Gagal mengubah PIN', 'error');
  } finally {
    setChangingPin(false);
  }
};
```

Render modern card in the settings view:
- Icon: `ShieldCheck` or `Lock`
- Inputs:
  1. PIN Saat Ini (6 digit)
  2. PIN Baru (6 digit)
  3. Konfirmasi PIN Baru (6 digit)
- Password / Text visibility toggle
- Action button: "Perbarui PIN Akses"

- [ ] **Step 2: Verify UI and interactions in settings**

Run `npm test` and build check.

- [ ] **Step 3: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(settings): add PIN security management card to settings page"
```

---

### Task 6: Full Verification, Non-Regression Test Suite, and PM2 Process Restart

**Files:**
- Test: All test files in `tests/`
- Build: Next.js production build

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: 100% tests passing across all suites (`auth-pin.test.ts`, `database.test.ts`, `drafts-api.test.ts`, `e2e-workflow.test.ts`, `hermes-api.test.ts`, `hermes-runner.test.ts`, `products-api.test.ts`, `revision-engine.test.ts`, `thread-editor.test.ts`).

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Successful build without errors.

- [ ] **Step 3: Restart PM2 production process**

Run: `npm run pm2:restart`
Expected: `threads-marketing` process restarted and online.

- [ ] **Step 4: Commit and finalize**

```bash
git add .
git commit -m "chore: complete 6-digit PIN authentication feature implementation"
```
