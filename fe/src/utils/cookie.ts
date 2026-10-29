// Cookie management utility for client-side token storage & auth sessions

export interface CookieOptions {
  days?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookieString = document.cookie;
  if (!cookieString) return null;

  const prefix = encodeURIComponent(name) + '=';
  const cookies = cookieString.split(';');

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.startsWith(prefix)) {
      try {
        return decodeURIComponent(cookie.substring(prefix.length));
      } catch {
        return cookie.substring(prefix.length);
      }
    }
  }

  return null;
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;

  const {
    days = 7,
    path = '/',
    domain,
    secure = typeof window !== 'undefined' && window.location.protocol === 'https:',
    sameSite = 'Lax',
  } = options;

  let cookieText = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    cookieText += `; expires=${date.toUTCString()}; max-age=${days * 24 * 60 * 60}`;
  }

  cookieText += `; path=${path}`;

  if (domain) {
    cookieText += `; domain=${domain}`;
  }

  if (secure) {
    cookieText += '; secure';
  }

  cookieText += `; samesite=${sameSite}`;

  document.cookie = cookieText;
}

export function deleteCookie(name: string, options: CookieOptions = {}): void {
  setCookie(name, '', { ...options, days: -1 });
}
