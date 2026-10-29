// Interceptor Infrastructure for DCC NG ICD API Client
import { authService } from '@/services/auth/authService';
import { parseApiError, type BaseRequestOptions } from './baseApi';

export interface RequestConfig extends BaseRequestOptions {
  url: string;
  headers: Record<string, string>;
}

export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = (
  response: Response,
  config: RequestConfig
) => Response | Promise<Response>;

export type ErrorInterceptor = (
  error: any,
  config?: RequestConfig
) => any;

export interface InterceptorHandler<T> {
  fulfilled: T;
  rejected?: ErrorInterceptor;
}

export class InterceptorManager<T> {
  private handlers: Array<InterceptorHandler<T> | null> = [];

  use(fulfilled: T, rejected?: ErrorInterceptor): number {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  getAll(): Array<InterceptorHandler<T>> {
    return this.handlers.filter((h): h is InterceptorHandler<T> => h !== null);
  }
}

/** Built-in Default Request Interceptors */
export const defaultRequestInterceptors: RequestInterceptor[] = [
  // 1. Auth & Cookie Token Header Injection
  async (config: RequestConfig) => {
    const token = authService.getToken();
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Ensure credentials: 'include' for cross-origin cookie propagation
    config.credentials = config.credentials || 'include';

    return config;
  },

  // 2. Tenant Context & Site/Role Headers
  async (config: RequestConfig) => {
    const activeSite = authService.getActiveSite();
    const activeRole = authService.getActiveRole();

    if (!config.headers['X-Site-Id'] && activeSite) {
      config.headers['X-Site-Id'] = activeSite;
    }
    if (!config.headers['X-Role-Code'] && activeRole) {
      config.headers['X-Role-Code'] = activeRole;
    }

    // Content types
    if (!config.headers['Content-Type'] && !config.headers['content-type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    if (!config.headers['Accept'] && !config.headers['accept']) {
      config.headers['Accept'] = 'application/json';
    }

    return config;
  },

  // 3. Idempotency Key Injection for mutating methods
  async (config: RequestConfig) => {
    const method = (config.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH'].includes(method) && !config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] =
        config.idempotencyKey ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`);
    }
    return config;
  },
];

/** Built-in Default Response Interceptors */
export const defaultResponseInterceptors: ResponseInterceptor[] = [
  // 1. Handle 401 Unauthorized by clearing cookie token & redirecting to login
  async (response: Response, config: RequestConfig) => {
    if (response.status === 401) {
      authService.clearToken();
      
      // Dispatch unauthorized event for reactive UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { url: config.url } }));
        
        // Redirect to login if not already there
        const hash = window.location.hash || '';
        if (!hash.includes('/login')) {
          const currentPath = hash.replace(/^#/, '') || '/';
          window.location.hash = `#/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return response;
  },

  // 2. Check for HTTP errors and format error payload
  async (response: Response) => {
    if (!response.ok) {
      throw await parseApiError(response);
    }
    return response;
  },
];
