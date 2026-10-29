// Shared API Base Infrastructure for DCC NG ICD

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

export interface BaseRequestOptions extends RequestInit {
  siteId?: string;
  roleCode?: string;
  idempotencyKey?: string;
}

export interface ApiErrorResponse {
  title?: string;
  detail?: string;
  message?: string;
  status?: number;
}

/** Formats a relative or absolute URL against the configured API_BASE_URL */
export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
}

/** Extracts and normalizes error messages from HTTP error responses */
export async function parseApiError(response: Response): Promise<Error> {
  let errorBody: ApiErrorResponse | null = null;
  try {
    errorBody = await response.json();
  } catch {
    errorBody = { message: response.statusText || `HTTP ${response.status}` };
  }
  const message =
    errorBody?.detail ||
    errorBody?.title ||
    errorBody?.message ||
    `HTTP ${response.status}: Request failed`;
  return new Error(message);
}
