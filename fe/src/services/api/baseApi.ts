// Shared API Base Infrastructure for DCC NG ICD
import { env } from '@/config/env';

export const API_BASE_URL: string = env.VITE_API_URL || 'http://localhost:4000/api';

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
  type?: string;
  instance?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  public status: number;
  public title?: string;
  public detail?: string;
  public type?: string;
  public instance?: string;
  public rawResponse?: Response;

  constructor(status: number, message: string, data?: Partial<ApiErrorResponse>, rawResponse?: Response) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.title = data?.title;
    this.detail = data?.detail;
    this.type = data?.type;
    this.instance = data?.instance;
    this.rawResponse = rawResponse;
  }
}

/** Formats a relative or absolute URL against the configured API_BASE_URL */
export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
}

/** Extracts and normalizes error messages from HTTP error responses conforming to RFC 7807 */
export async function parseApiError(response: Response): Promise<ApiError> {
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

  return new ApiError(response.status, message, errorBody || undefined, response);
}
