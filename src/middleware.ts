
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const PROTECTED_ROUTES = ['/dashboard', '/orders', '/inventory', '/pickup', '/stock-alerts', '/profile'];
const PUBLIC_ROUTES_FOR_REDIRECT = ['/login', '/signup', '/forgot-password'];
const ADMIN_ROUTE = '/admin';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(AUTH_COOKIE_NAME);

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRedirectRoute = PUBLIC_ROUTES_FOR_REDIRECT.some(route => pathname.startsWith(route));

  // If there's no token
  if (!hasToken) {
    // If trying to access a protected route, redirect to login
    if (isProtectedRoute || pathname.startsWith(ADMIN_ROUTE)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // If on the root, also redirect to login
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Otherwise, allow access to public pages
    return NextResponse.next();
  }

  // If there is a token
  // And the user is on a public page meant for unauthenticated users, redirect to dashboard
  if (isPublicRedirectRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If the user is on the root path, send them to the dashboard.
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // For all other cases (e.g., accessing a protected route with a token), allow the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
