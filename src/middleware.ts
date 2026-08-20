import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/session';

// Paths that never require PIN authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/pin',
  '/api/auth/logout',
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
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');
  if (
    pathname.startsWith('/api/hermes') ||
    ((authHeader || apiKeyHeader) && (pathname.startsWith('/api/settings') || pathname.startsWith('/api/drafts')))
  ) {
    return NextResponse.next();
  }

  // 3. Check session cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = sessionCookie ? await verifySessionToken(sessionCookie) : false;

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
