// Configured Shared API Client for DCC NG ICD with Interceptor Pipeline
import { buildApiUrl, type BaseRequestOptions } from './baseApi';
import {
  InterceptorManager,
  defaultRequestInterceptors,
  defaultResponseInterceptors,
  type RequestConfig,
  type RequestInterceptor,
  type ResponseInterceptor,
} from './interceptors';

export type RequestOptions = BaseRequestOptions;

const requestInterceptors = new InterceptorManager<RequestInterceptor>();
const responseInterceptors = new InterceptorManager<ResponseInterceptor>();

// Register default built-in interceptors
defaultRequestInterceptors.forEach((interceptor) => requestInterceptors.use(interceptor));
defaultResponseInterceptors.forEach((interceptor) => responseInterceptors.use(interceptor));

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = buildApiUrl(endpoint);

  let config: RequestConfig = {
    ...options,
    url,
    headers: {
      ...((options.headers as Record<string, string>) || {}),
    },
  };

  // 1. Run through Request Interceptor chain
  for (const handler of requestInterceptors.getAll()) {
    try {
      config = await handler.fulfilled(config);
    } catch (err) {
      if (handler.rejected) {
        config = await handler.rejected(err, config);
      } else {
        throw err;
      }
    }
  }

  // 2. Execute network request
  let response: Response;
  try {
    response = await fetch(config.url, config);
  } catch (networkError) {
    // If request failed at the network level
    for (const handler of responseInterceptors.getAll()) {
      if (handler.rejected) {
        return await handler.rejected(networkError, config);
      }
    }
    throw networkError;
  }

  // 3. Run through Response Interceptor chain
  for (const handler of responseInterceptors.getAll()) {
    try {
      response = await handler.fulfilled(response, config);
    } catch (err) {
      if (handler.rejected) {
        return await handler.rejected(err, config);
      } else {
        throw err;
      }
    }
  }

  // Handle empty responses (e.g. 204 No Content)
  if (response.status === 204) {
    return null as unknown as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text() as unknown as T;
}

// Interceptor hook extension
apiClient.interceptors = {
  request: requestInterceptors,
  response: responseInterceptors,
};

export const api = {
  get: <T = any>(endpoint: string, opts?: RequestOptions) => apiClient<T>(endpoint, { ...opts, method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any, opts?: RequestOptions) =>
    apiClient<T>(endpoint, { ...opts, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any, opts?: RequestOptions) =>
    apiClient<T>(endpoint, { ...opts, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any, opts?: RequestOptions) =>
    apiClient<T>(endpoint, { ...opts, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string, opts?: RequestOptions) => apiClient<T>(endpoint, { ...opts, method: 'DELETE' }),
  interceptors: apiClient.interceptors,
};
