import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/' || pathname === '/admin/login' || pathname === '/company/login') {
    return NextResponse.next();
  }

  // Admin routes - check for refresh_token cookie
  if (pathname.startsWith('/admin')) {
    const refreshToken = request.cookies.get('refresh_token');
    if (!refreshToken) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Company routes - check for company_refresh_token cookie
  if (pathname.startsWith('/company')) {
    const companyToken = request.cookies.get('company_refresh_token');
    if (!companyToken) {
      return NextResponse.redirect(new URL('/company/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|api|.*\\..*).*)'],
};
