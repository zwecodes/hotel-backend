const isProd = process.env.NODE_ENV === 'production';

/** Cross-site (Vercel ↔ Railway) needs SameSite=None + Secure. Localhost is same-site. */
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
};

const ACCESS_COOKIE  = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const ACCESS_MAX_AGE_MS  = 15 * 60 * 1000;           // 15 minutes
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
const REMEMBER_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function setAuthCookies(res, { accessToken, refreshToken, remember = false }) {
  const refreshMaxAge = remember ? REMEMBER_MAX_AGE_MS : REFRESH_MAX_AGE_MS;

  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    maxAge: ACCESS_MAX_AGE_MS,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    maxAge: refreshMaxAge,
  });
}

function clearAuthCookies(res) {
  const clearOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
  res.clearCookie(ACCESS_COOKIE, clearOpts);
  res.clearCookie(REFRESH_COOKIE, clearOpts);
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_MAX_AGE_MS,
  REFRESH_MAX_AGE_MS,
  REMEMBER_MAX_AGE_MS,
  setAuthCookies,
  clearAuthCookies,
};
