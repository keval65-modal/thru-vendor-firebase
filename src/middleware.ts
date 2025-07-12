
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const PROTECTED_ROUTES = ['/dashboard', '/orders', '/inventory', '/pickup', '/stock-alerts', '/profile'];
const ADMIN_PROTECTED_ROUTES = ['/admin'];
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password'];
const ADMIN_LOGIN_ROUTE = '/admin/login';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminProtectedRoute = ADMIN_PROTECTED_ROUTES.some(route => pathname.startsWith(route) && !pathname.startsWith(ADMIN_LOGIN_ROUTE));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // If NOT logged in, and trying to access a protected route, redirect to the correct login page.
  if (!token) {
    if (isProtectedRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (isAdminProtectedRoute) {
      const loginUrl = new URL(ADMIN_LOGIN_ROUTE, request.url);
      loginUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If LOGGED IN, handle redirects away from public/login pages.
  if (token) {
    // If logged in and trying to access a standard public page (like /login), redirect to dashboard.
    // We explicitly exclude /admin/login from this rule.
    if (isPublicRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // If it's the root path, decide where to go based on token.
    if (pathname === '/') {
       return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // If it's the root path and there's no token, go to login.
  if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
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
