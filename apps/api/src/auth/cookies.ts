import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'tz_access';
export const REFRESH_COOKIE = 'tz_refresh';

function base(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; refreshExpiresAt: Date },
) {
  // La cookie de acceso dura lo mismo que la sesión; la validez real la da el JWT (15 min).
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base(), path: '/', expires: tokens.refreshExpiresAt });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(),
    path: '/api/auth',
    expires: tokens.refreshExpiresAt,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...base(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base(), path: '/api/auth' });
}
