/**
 * SSR-safe browser API wrappers.
 * All functions return safe defaults when running on the server (Node.js).
 */

/** Returns true only when running in the browser */
export const isBrowser = typeof window !== 'undefined';

/** Safe localStorage wrapper — no-ops on the server */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser) return null;
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser) return;
    try { localStorage.setItem(key, value); } catch { /* noop */ }
  },
  removeItem: (key: string): void => {
    if (!isBrowser) return;
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};

/** Safe sessionStorage wrapper — no-ops on the server */
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser) return null;
    try { return sessionStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser) return;
    try { sessionStorage.setItem(key, value); } catch { /* noop */ }
  },
  removeItem: (key: string): void => {
    if (!isBrowser) return;
    try { sessionStorage.removeItem(key); } catch { /* noop */ }
  },
};

/** Safe navigator.userAgent — returns empty string on server */
export const safeUserAgent = (): string => {
  if (!isBrowser) return '';
  return navigator?.userAgent ?? '';
};
