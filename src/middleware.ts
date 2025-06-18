
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const PROTECTED_ROUTES = ['/dashboard', '/orders', '/inventory', '/pickup', '/stock-alerts'];
const PUBLIC_ROUTES = ['/login', '/signup']; // Added /signup

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    // Redirect to login if trying to access a protected route without a token
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && token && (pathname === '/login' || pathname === '/signup')) {
    // If logged in and trying to access login or signup page, redirect to orders (home screen)
    return NextResponse.redirect(new URL('/orders', request.url));
  }
  
  // If it's the root path
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/orders', request.url)); // Changed from /dashboard
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }


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
