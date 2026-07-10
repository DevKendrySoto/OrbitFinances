import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  sessionCookieOptions,
} from './lib/session-config';

const BACKEND_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3000';
const protectedRoutes = ['/dashboard', '/calendar', '/goals', '/reports', '/incomes', '/expenses'];
const publicOnlyRoutes = ['/login', '/register'];

async function refreshSession(refreshToken: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as { accessToken: string; refreshToken: string };
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has(ACCESS_COOKIE);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  // El token de acceso dura 15 min y el navegador lo borra solo al expirar (maxAge).
  // Si ya no está pero el refresh token (30 días) sigue vivo, renovamos la sesión
  // en silencio en vez de forzar un login.
  if (isProtected && !hasAccessToken) {
    if (refreshToken) {
      const refreshed = await refreshSession(refreshToken);
      if (refreshed) {
        const response = NextResponse.next();
        response.cookies.set(ACCESS_COOKIE, refreshed.accessToken, {
          ...sessionCookieOptions,
          maxAge: ACCESS_TOKEN_TTL_SECONDS,
        });
        response.cookies.set(REFRESH_COOKIE, refreshed.refreshToken, {
          ...sessionCookieOptions,
          maxAge: REFRESH_TOKEN_TTL_SECONDS,
        });
        return response;
      }
    }

    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  if (publicOnlyRoutes.some((route) => pathname.startsWith(route)) && hasAccessToken) {
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
    '/incomes/:path*',
    '/expenses/:path*',
    '/login',
    '/register',
  ],
};
