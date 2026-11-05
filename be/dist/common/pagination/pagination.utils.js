"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION_DEFAULTS = void 0;
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
exports.parsePaginationParams = parsePaginationParams;
exports.toPaginatedResponse = toPaginatedResponse;
exports.paginateArray = paginateArray;
exports.buildPrismaPagination = buildPrismaPagination;
exports.PAGINATION_DEFAULTS = {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 200,
    DEFAULT_PAGE: 1
};
/**
 * Encodes an object or primitive into a URL-safe Base64 cursor string.
 */
function encodeCursor(payload) {
    try {
        const json = JSON.stringify(payload);
        return Buffer.from(json, 'utf-8').toString('base64url');
    }
    catch {
        return '';
    }
}
/**
 * Decodes a URL-safe Base64 cursor string back into its original payload.
 */
function decodeCursor(cursorStr) {
    if (!cursorStr || typeof cursorStr !== 'string')
        return null;
    try {
        const json = Buffer.from(cursorStr, 'base64url').toString('utf-8');
        return JSON.parse(json);
    }
    catch {
        return null;
    }
}
/**
 * Extracts, sanitizes, and normalizes pagination parameters from an Express request query.
 */
function parsePaginationParams(query = {}, options) {
    const defaultLimit = options?.defaultLimit ?? exports.PAGINATION_DEFAULTS.DEFAULT_LIMIT;
    const maxLimit = options?.maxLimit ?? exports.PAGINATION_DEFAULTS.MAX_LIMIT;
    // Limit / PageSize
    const rawLimit = query.limit ?? query.pageSize ?? query.per_page;
    let limit = parseInt(String(rawLimit), 10);
    if (isNaN(limit) || limit < 1) {
        limit = defaultLimit;
    }
    else if (limit > maxLimit) {
        limit = maxLimit;
    }
    // Cursor or Page
    const cursor = query.cursor ? String(query.cursor).trim() : null;
    let page;
    let skip;
    if (query.page !== undefined) {
        const parsedPage = parseInt(String(query.page), 10);
        page = !isNaN(parsedPage) && parsedPage >= 1 ? parsedPage : exports.PAGINATION_DEFAULTS.DEFAULT_PAGE;
        skip = (page - 1) * limit;
    }
    const sortBy = query.sortBy ?? query.sort ?? undefined;
    let sortOrder = 'asc';
    if (query.sortOrder) {
        sortOrder = String(query.sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc';
    }
    else if (typeof sortBy === 'string' && sortBy.startsWith('-')) {
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
function toPaginatedResponse(items, total, params, customNextCursor) {
    const { limit, page } = params;
    let nextCursor = null;
    if (customNextCursor !== undefined) {
        nextCursor = customNextCursor;
    }
    else if (page !== undefined) {
        const totalPages = Math.ceil(total / limit) || 1;
        nextCursor = page < totalPages ? encodeCursor({ page: page + 1 }) : null;
    }
    const totalPages = page !== undefined ? Math.ceil(total / limit) || 1 : undefined;
    const hasNext = nextCursor !== null || (page !== undefined && totalPages !== undefined && page < totalPages);
    const hasPrev = page !== undefined ? page > 1 : false;
    const metadata = {
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
function paginateArray(array, params, cursorKeyExtractor) {
    const total = array.length;
    const { limit, cursor, page } = params;
    let startIndex = 0;
    // 1. If cursor is provided, find item index after the cursor
    if (cursor && cursorKeyExtractor) {
        const decoded = decodeCursor(cursor);
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
    }
    else if (page !== undefined) {
        // 2. Offset pagination
        startIndex = (page - 1) * limit;
    }
    startIndex = Math.max(0, startIndex);
    const slicedItems = array.slice(startIndex, startIndex + limit);
    // Generate next cursor
    let nextCursor = null;
    if (startIndex + limit < total) {
        const lastItem = slicedItems[slicedItems.length - 1];
        if (lastItem && cursorKeyExtractor) {
            nextCursor = encodeCursor({ id: cursorKeyExtractor(lastItem) });
        }
        else if (page !== undefined) {
            nextCursor = encodeCursor({ page: page + 1 });
        }
        else {
            nextCursor = encodeCursor({ offset: startIndex + limit });
        }
    }
    return toPaginatedResponse(slicedItems, total, params, nextCursor);
}
/**
 * Helper to generate Prisma findMany arguments from pagination params.
 */
function buildPrismaPagination(params) {
    const { limit, skip, cursor, sortBy, sortOrder } = params;
    const prismaOptions = {
        take: limit
    };
    if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded && typeof decoded === 'object') {
            prismaOptions.cursor = decoded;
            prismaOptions.skip = 1; // Skip the cursor itself
        }
    }
    else if (skip !== undefined) {
        prismaOptions.skip = skip;
    }
    if (sortBy) {
        prismaOptions.orderBy = {
            [sortBy]: sortOrder || 'asc'
        };
    }
    return prismaOptions;
}
