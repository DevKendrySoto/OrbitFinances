export const ACCESS_COOKIE = 'orbitfinc_access_token';
export const REFRESH_COOKIE = 'orbitfinc_refresh_token';

export const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.JWT_ACCESS_TOKEN_TTL ?? 900);
export const REFRESH_TOKEN_TTL_DAYS = Number(process.env.JWT_REFRESH_TOKEN_TTL_DAYS ?? 30);
export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
