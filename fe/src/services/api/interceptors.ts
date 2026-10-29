// Centralized Interceptor Infrastructure for DCC NG ICD API Client
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

/** Built-in Centralized Request Interceptors */
export const defaultRequestInterceptors: RequestInterceptor[] = [
  // 1. Auth & Token Injection
  async (config: RequestConfig) => {
    const token = authService.getToken();
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Always include cookies for session persistence
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

    // JSON headers (unless using FormData for file upload)
    if (!(config.body instanceof FormData)) {
      if (!config.headers['Content-Type'] && !config.headers['content-type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    } else {
      // Let the browser set the boundary for multipart/form-data
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    if (!config.headers['Accept'] && !config.headers['accept']) {
      config.headers['Accept'] = 'application/json';
    }

    return config;
  },

  // 3. Idempotency Key Injection for mutating methods (POST, PUT, PATCH, DELETE)
  async (config: RequestConfig) => {
    const method = (config.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] =
        config.idempotencyKey ||
        (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`);
    }
    return config;
  },
];

/** Built-in Centralized Response Interceptors */
export const defaultResponseInterceptors: ResponseInterceptor[] = [
  // 1. Handle 401 Unauthorized (Session Expired / Invalid Token)
  async (response: Response, config: RequestConfig) => {
    if (response.status === 401) {
      authService.clearToken();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { url: config.url } }));

        // Standard HTML5 browser redirect to /login
        if (window.location.pathname !== '/login') {
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return response;
  },

  // 2. Handle 403 Forbidden (Permission Denied)
  async (response: Response, config: RequestConfig) => {
    if (response.status === 403) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:forbidden', { detail: { url: config.url } }));
      }
    }
    return response;
  },

  // 3. Check for HTTP errors and throw normalized ApiError
  async (response: Response) => {
    if (!response.ok) {
      throw await parseApiError(response);
    }
    return response;
  },
];
