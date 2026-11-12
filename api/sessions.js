import { createHash, randomBytes } from 'node:crypto';
export const SESSION_COOKIE_NAME = 'mashwark_session';
export const VERIFICATION_COOKIE_NAME = 'mashwark_verification_context';
export const SESSION_TTL_MS = 7 * 86400000;
export const CHALLENGE_TTL_MS = 10 * 60000;
export const newToken = () => randomBytes(32).toString('base64url');
export const isToken = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export const hashToken = (value) => createHash('sha256').update(value).digest('hex');
export function readCookie(request, name) {
  if (typeof request.headers.cookie !== 'string') return null;
  for (const item of request.headers.cookie.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(item.slice(separator + 1).trim()); } catch { return null; }
  }
  return null;
}
export const writeCookie = (response, name, value, { secure, maxAgeMs }) => response.cookie(name, value, { httpOnly: true, secure, sameSite: 'lax', path: '/api', maxAge: maxAgeMs });
export const clearCookie = (response, name, secure) => response.clearCookie(name, { httpOnly: true, secure, sameSite: 'lax', path: '/api' });
export function readSessionFromRequest(request, store, now = Date.now()) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  return isToken(token) ? store.getSession(hashToken(token), now) : null;
}
