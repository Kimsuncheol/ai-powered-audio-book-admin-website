import { NextResponse, type NextRequest } from 'next/server';

// Must match the cookie name set in AuthContext.tsx
const AUTH_TOKEN_COOKIE = 'admin_auth_token';

// Public paths that do not require authentication
const PUBLIC_PATHS = ['/login', '/sign-up'];

// Paths that authenticated users should be redirected away from (FR-SESSION-001)
const AUTH_REDIRECT_PATHS = ['/login', '/sign-up'];

// Next.js 16 uses "proxy" as the export name (renamed from "middleware")
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  const isAuthenticated = Boolean(token);
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Redirect unauthenticated users to /login, preserving intended destination
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from the login page
  if (isAuthenticated && AUTH_REDIRECT_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
