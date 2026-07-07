import { NextRequest, NextResponse } from 'next/server';

const ACCESS_COOKIE = 'orbitfinc_access_token';
const protectedRoutes = ['/dashboard', '/calendar', '/goals', '/reports'];
const publicOnlyRoutes = ['/login', '/register'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(ACCESS_COOKIE);

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (publicOnlyRoutes.some((route) => pathname.startsWith(route)) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/calendar/:path*',
    '/goals/:path*',
    '/reports/:path*',
    '/login',
    '/register',
  ],
};
