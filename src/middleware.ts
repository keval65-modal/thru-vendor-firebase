
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const PROTECTED_ROUTES = ['/dashboard', '/orders', '/inventory', '/pickup', '/stock-alerts', '/profile'];
const ADMIN_PROTECTED_ROUTES = ['/admin'];
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password'];
const ADMIN_PUBLIC_ROUTES = ['/admin/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminProtectedRoute = ADMIN_PROTECTED_ROUTES.some(route => pathname.startsWith(route) && !pathname.startsWith('/admin/login'));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isAdminPublicRoute = ADMIN_PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    // Redirect to login if trying to access a protected vendor route without a token
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  if (isAdminProtectedRoute && !token) {
    // Redirect to admin login if trying to access a protected admin route without a token
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((isPublicRoute || isAdminPublicRoute) && token) {
    // If logged in and trying to access a public page, redirect to the main dashboard
    // This logic might need refinement if an admin is logged in and tries to access /login
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If it's the root path
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
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
