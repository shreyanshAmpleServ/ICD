"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendCreated = exports.sendSuccess = exports.ApiResponse = void 0;
exports.responseEnhancer = responseEnhancer;
/**
 * Standardized API Response Helper
 */
class ApiResponse {
    /**
     * Send a standardized success response
     * Supports arrays, paginated collections, and single resource objects
     */
    static success(res, data, message = 'Success', statusCode = 200, meta) {
        // 1. Paginated collection ({ items: [...], total, page, pageSize, ... })
        if (data && typeof data === 'object' && Array.isArray(data.items)) {
            const { items, ...pagination } = data;
            return res.status(statusCode).json({
                success: true,
                message,
                items,
                data: items,
                ...pagination,
                ...(meta ? { meta } : {})
            });
        }
        // 2. Pure array response
        if (Array.isArray(data)) {
            return res.status(statusCode).json({
                success: true,
                message,
                total: data.length,
                items: data,
                data,
                ...(meta ? { meta } : {})
            });
        }
        // 3. Single object resource
        if (data && typeof data === 'object') {
            return res.status(statusCode).json({
                success: true,
                message,
                data,
                ...data, // Preserve direct top-level access for UI contracts (e.g. summary metrics)
                ...(meta ? { meta } : {})
            });
        }
        // 4. Primitive / scalar value
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            ...(meta ? { meta } : {})
        });
    }
    /**
     * Send a 201 Created response
     */
    static created(res, data, message = 'Resource created successfully', meta) {
        return ApiResponse.success(res, data, message, 201, meta);
    }
    /**
     * Send a 204 No Content response
     */
    static noContent(res) {
        return res.status(204).send();
    }
    /**
     * Send a standardized error response
     */
    static error(res, message = 'An error occurred', statusCode = 500, options = {}) {
        return res.status(statusCode).json({
            success: false,
            status: statusCode,
            code: options.code || `HTTP_${statusCode}`,
            message,
            detail: options.detail || message,
            ...(options.errors ? { errors: options.errors } : {}),
            ...(options.meta ? { meta: options.meta } : {}),
            timestamp: new Date().toISOString()
        });
    }
    static badRequest(res, message = 'Bad request', errors) {
        return ApiResponse.error(res, message, 400, { code: 'BAD_REQUEST', errors });
    }
    static unauthorized(res, message = 'Unauthorized') {
        return ApiResponse.error(res, message, 401, { code: 'UNAUTHORIZED' });
    }
    static forbidden(res, message = 'Forbidden') {
        return ApiResponse.error(res, message, 403, { code: 'FORBIDDEN' });
    }
    static notFound(res, message = 'Resource not found') {
        return ApiResponse.error(res, message, 404, { code: 'NOT_FOUND' });
    }
    static conflict(res, message = 'Resource conflict') {
        return ApiResponse.error(res, message, 409, { code: 'CONFLICT' });
    }
    static unprocessable(res, message = 'Unprocessable entity', errors) {
        return ApiResponse.error(res, message, 422, { code: 'UNPROCESSABLE_ENTITY', errors });
    }
}
exports.ApiResponse = ApiResponse;
/**
 * Functional helpers for direct importing
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta) => ApiResponse.success(res, data, message, statusCode, meta);
exports.sendSuccess = sendSuccess;
const sendCreated = (res, data, message = 'Resource created successfully', meta) => ApiResponse.created(res, data, message, meta);
exports.sendCreated = sendCreated;
const sendError = (res, message = 'An error occurred', statusCode = 500, options = {}) => ApiResponse.error(res, message, statusCode, options);
exports.sendError = sendError;
/**
 * Express middleware to attach helpers directly to `res` object
 */
function responseEnhancer(req, res, next) {
    res.success = (data, message, statusCode, meta) => ApiResponse.success(res, data, message, statusCode, meta);
    res.created = (data, message, meta) => ApiResponse.created(res, data, message, meta);
    res.error = (message, statusCode, options) => ApiResponse.error(res, message, statusCode, options);
    next();
}
