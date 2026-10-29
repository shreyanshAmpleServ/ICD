import { PaginationParams, PaginationMeta, PaginatedResponse } from './pagination.types';

export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
  DEFAULT_PAGE: 1
} as const;

/**
 * Encodes an object or primitive into a URL-safe Base64 cursor string.
 */
export function encodeCursor<T = unknown>(payload: T): string {
  try {
    const json = JSON.stringify(payload);
    return Buffer.from(json, 'utf-8').toString('base64url');
  } catch {
    return '';
  }
}

/**
 * Decodes a URL-safe Base64 cursor string back into its original payload.
 */
export function decodeCursor<T = unknown>(cursorStr: string | null | undefined): T | null {
  if (!cursorStr || typeof cursorStr !== 'string') return null;
  try {
    const json = Buffer.from(cursorStr, 'base64url').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Extracts, sanitizes, and normalizes pagination parameters from an Express request query.
 */
export function parsePaginationParams(
  query: Record<string, any> = {},
  options?: { defaultLimit?: number; maxLimit?: number }
): PaginationParams {
  const defaultLimit = options?.defaultLimit ?? PAGINATION_DEFAULTS.DEFAULT_LIMIT;
  const maxLimit = options?.maxLimit ?? PAGINATION_DEFAULTS.MAX_LIMIT;

  // Limit / PageSize
  const rawLimit = query.limit ?? query.pageSize ?? query.per_page;
  let limit = parseInt(String(rawLimit), 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  // Cursor or Page
  const cursor = query.cursor ? String(query.cursor).trim() : null;
  let page: number | undefined;
  let skip: number | undefined;

  if (query.page !== undefined) {
    const parsedPage = parseInt(String(query.page), 10);
    page = !isNaN(parsedPage) && parsedPage >= 1 ? parsedPage : PAGINATION_DEFAULTS.DEFAULT_PAGE;
    skip = (page - 1) * limit;
  }

  const sortBy = query.sortBy ?? query.sort ?? undefined;
  let sortOrder: 'asc' | 'desc' = 'asc';
  if (query.sortOrder) {
    sortOrder = String(query.sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc';
  } else if (typeof sortBy === 'string' && sortBy.startsWith('-')) {
    sortOrder = 'desc';
  }

  return {
    limit,
    page,
    skip,
    cursor,
    sortBy: typeof sortBy === 'string' ? sortBy.replace(/^[+-]/, '') : undefined,
    sortOrder
  };
}

/**
 * Builds a standardized PaginatedResponse from items and metadata
 */
export function toPaginatedResponse<T>(
  items: T[],
  total: number,
  params: PaginationParams,
  customNextCursor?: string | null
): PaginatedResponse<T> {
  const { limit, page } = params;

  let nextCursor: string | null = null;
  if (customNextCursor !== undefined) {
    nextCursor = customNextCursor;
  } else if (page !== undefined) {
    const totalPages = Math.ceil(total / limit) || 1;
    nextCursor = page < totalPages ? encodeCursor({ page: page + 1 }) : null;
  }

  const totalPages = page !== undefined ? Math.ceil(total / limit) || 1 : undefined;
  const hasNext = nextCursor !== null || (page !== undefined && totalPages !== undefined && page < totalPages);
  const hasPrev = page !== undefined ? page > 1 : false;

  const metadata: PaginationMeta = {
    total,
    limit,
    page,
    totalPages,
    hasNext,
    hasPrev,
    nextCursor
  };

  return {
    items,
    total,
    nextCursor,
    pagination: metadata
  };
}

/**
 * Paginates an in-memory array using cursor-based or offset-based parameters.
 * Ideal for fallback stores, memory datasets, or pre-fetched collections.
 */
export function paginateArray<T>(
  array: T[],
  params: PaginationParams,
  cursorKeyExtractor?: (item: T) => any
): PaginatedResponse<T> {
  const total = array.length;
  const { limit, cursor, page } = params;

  let startIndex = 0;

  // 1. If cursor is provided, find item index after the cursor
  if (cursor && cursorKeyExtractor) {
    const decoded = decodeCursor<any>(cursor);
    if (decoded !== null) {
      const cursorVal = typeof decoded === 'object' && decoded?.id !== undefined ? decoded.id : decoded;
      const foundIdx = array.findIndex(item => {
        const key = cursorKeyExtractor(item);
        return String(key) === String(cursorVal);
      });
      if (foundIdx !== -1) {
        startIndex = foundIdx + 1;
      }
    }
  } else if (page !== undefined) {
    // 2. Offset pagination
    startIndex = (page - 1) * limit;
  }

  startIndex = Math.max(0, startIndex);
  const slicedItems = array.slice(startIndex, startIndex + limit);

  // Generate next cursor
  let nextCursor: string | null = null;
  if (startIndex + limit < total) {
    const lastItem = slicedItems[slicedItems.length - 1];
    if (lastItem && cursorKeyExtractor) {
      nextCursor = encodeCursor({ id: cursorKeyExtractor(lastItem) });
    } else if (page !== undefined) {
      nextCursor = encodeCursor({ page: page + 1 });
    } else {
      nextCursor = encodeCursor({ offset: startIndex + limit });
    }
  }

  return toPaginatedResponse(slicedItems, total, params, nextCursor);
}

/**
 * Helper to generate Prisma findMany arguments from pagination params.
 */
export function buildPrismaPagination(params: PaginationParams): {
  skip?: number;
  take: number;
  cursor?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const { limit, skip, cursor, sortBy, sortOrder } = params;

  const prismaOptions: {
    skip?: number;
    take: number;
    cursor?: Record<string, any>;
    orderBy?: Record<string, 'asc' | 'desc'>;
  } = {
    take: limit
  };

  if (cursor) {
    const decoded = decodeCursor<Record<string, any>>(cursor);
    if (decoded && typeof decoded === 'object') {
      prismaOptions.cursor = decoded;
      prismaOptions.skip = 1; // Skip the cursor itself
    }
  } else if (skip !== undefined) {
    prismaOptions.skip = skip;
  }

  if (sortBy) {
    prismaOptions.orderBy = {
      [sortBy]: sortOrder || 'asc'
    };
  }

  return prismaOptions;
}

