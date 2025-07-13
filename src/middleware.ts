
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'thru_vendor_auth_token';
const PROTECTED_ROUTES = ['/dashboard', '/orders', '/inventory', '/pickup', '/stock-alerts', '/profile'];
const PUBLIC_ROUTES_FOR_REDIRECT = ['/login', '/signup']; // Pages to redirect from if logged in

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRouteForRedirect = PUBLIC_ROUTES_FOR_REDIRECT.some(route => pathname.startsWith(route));

  // If trying to access admin route, allow it unconditionally.
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // --- No Token ---
  if (!token) {
    // Redirect to the login page if trying to access a protected route
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Redirect from root to login if no token
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    // Otherwise, allow access to public routes
    return NextResponse.next();
  }

  // --- Has Token ---
  // If the user has a token and is trying to access a regular login/signup page,
  // redirect them to their main dashboard.
  if (isPublicRouteForRedirect) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If the user has a token and is on the root path, send them to the dashboard.
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // In all other cases, allow the request to proceed.
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
