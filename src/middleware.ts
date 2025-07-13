
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const PROTECTED_ROUTES = ['/dashboard', '/orders', '/inventory', '/pickup', '/stock-alerts', '/profile'];
const ADMIN_PROTECTED_ROUTES = ['/admin'];
const PUBLIC_ROUTES_FOR_REDIRECT = ['/login', '/signup']; // Pages to redirect from if logged in
const ADMIN_LOGIN_ROUTE = '/admin/login';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminProtectedRoute = ADMIN_PROTECTED_ROUTES.some(route => pathname.startsWith(route) && !pathname.startsWith(ADMIN_LOGIN_ROUTE));
  const isPublicRouteForRedirect = PUBLIC_ROUTES_FOR_REDIRECT.some(route => pathname.startsWith(route));

  // If there's no token...
  if (!token) {
    // and they try to access a protected route, redirect to the normal login page.
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // and they try to access a protected admin route, redirect to the admin login page.
    if (isAdminProtectedRoute) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_ROUTE, request.url));
    }
    // and it's the root, send them to login.
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    // Otherwise, allow access to public routes (like /login, /signup, /admin/login, /forgot-password)
    return NextResponse.next();
  }

  // If there IS a token...
  // and they are on a public route we want to redirect from (login/signup), send them to dashboard.
  // This prevents logged-in users from seeing the signup/login pages again.
  if (isPublicRouteForRedirect) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // and they are on the root path, send them to the dashboard.
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // In all other cases (e.g., logged-in user accessing a protected route or forgot-password), allow the request.
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
