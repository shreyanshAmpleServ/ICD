// Shared Auth & Session Service for DCC NG ICD with Cookie Token Support
import { getCookie, setCookie, deleteCookie } from '@/utils/cookie';

export const AUTH_COOKIE_NAME = 'auth_token';
const TOKEN_KEY = 'ngicd.token';
const SITE_KEY = 'ngicd.site';
const ROLE_KEY = 'ngicd.role';
const USER_KEY = 'ngicd.user';

export interface StoredUser {
  userId?: number;
  username: string;
  email?: string;
  roleCode: string;
  siteId: string;
  isExternal?: boolean;
}

export const authService = {
  getToken(): string | null {
    // 1. Prioritize reading from HTTP/document cookie
    const cookieToken = getCookie(AUTH_COOKIE_NAME);
    if (cookieToken) return cookieToken;

    // 2. Fallback to localStorage / sessionStorage
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string, persist: boolean = true): void {
    // 1. Write to cookie
    setCookie(AUTH_COOKIE_NAME, token, {
      days: persist ? 7 : undefined,
      path: '/',
      sameSite: 'Lax',
    });

    // 2. Synchronize to storage for offline / quick hydration
    try {
      if (persist) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    } catch {}
  },

  clearToken(): void {
    // 1. Remove cookie
    deleteCookie(AUTH_COOKIE_NAME, { path: '/' });

    // 2. Clear storage
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },

  getUser(): StoredUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user: StoredUser): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      if (user.roleCode) this.setActiveRole(user.roleCode);
      if (user.siteId) this.setActiveSite(user.siteId);
    } catch {}
  },

  getActiveSite(): string {
    try {
      const raw = localStorage.getItem(SITE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed === 1 || parsed === '1') return 'DAR1';
        if (parsed === 2 || parsed === '2') return 'DAR2';
        if (parsed === 3 || parsed === '3') return 'KBH1';
        if (typeof parsed === 'string' && parsed) return parsed;
      }
    } catch {}
    return 'DAR1';
  },

  setActiveSite(siteId: string): void {
    try {
      localStorage.setItem(SITE_KEY, JSON.stringify(siteId));
    } catch {}
  },

  getActiveRole(): string {
    try {
      const raw = localStorage.getItem(ROLE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) return parsed;
      }
    } catch {}
    return '__ALL__';
  },

  setActiveRole(roleCode: string): void {
    try {
      localStorage.setItem(ROLE_KEY, JSON.stringify(roleCode));
    } catch {}
  },

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  },
};
