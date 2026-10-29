/**
 * DCC NG ICD — Pagination Types & Contracts
 * Fully compatible with the OpenAPI 3.1 Contract and REST Best Practices
 */

export interface PaginationParams {
  limit: number;
  page?: number;
  skip?: number;
  cursor?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  limit: number;
  page?: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor: string | null;
  prevCursor?: string | null;
}

/**
 * Standard Paginated Response
 * Meets both the OpenAPI specification contract ({ items, nextCursor, total })
 * and provides extended metadata for rich web UIs.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
  pagination: PaginationMeta;
}

