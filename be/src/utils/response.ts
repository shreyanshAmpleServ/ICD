import { Response, Request, NextFunction } from 'express';

export interface ApiResponseOptions {
  message?: string;
  statusCode?: number;
  meta?: Record<string, unknown>;
}

export interface ApiErrorOptions {
  code?: string;
  detail?: string;
  errors?: any;
  meta?: Record<string, unknown>;
}

/**
 * Standardized API Response Helper
 */
export class ApiResponse {
  /**
   * Send a standardized success response
   * Supports arrays, paginated collections, and single resource objects
   */
  public static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>
  ): Response {
    // 1. Paginated collection ({ items: [...], total, page, pageSize, ... })
    if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
      const { items, ...pagination } = data as any;
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
  public static created<T>(
    res: Response,
    data: T,
    message = 'Resource created successfully',
    meta?: Record<string, unknown>
  ): Response {
    return ApiResponse.success(res, data, message, 201, meta);
  }

  /**
   * Send a 204 No Content response
   */
  public static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send a standardized error response
   */
  public static error(
    res: Response,
    message = 'An error occurred',
    statusCode = 500,
    options: ApiErrorOptions = {}
  ): Response {
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

  public static badRequest(res: Response, message = 'Bad request', errors?: any): Response {
    return ApiResponse.error(res, message, 400, { code: 'BAD_REQUEST', errors });
  }

  public static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return ApiResponse.error(res, message, 401, { code: 'UNAUTHORIZED' });
  }

  public static forbidden(res: Response, message = 'Forbidden'): Response {
    return ApiResponse.error(res, message, 403, { code: 'FORBIDDEN' });
  }

  public static notFound(res: Response, message = 'Resource not found'): Response {
    return ApiResponse.error(res, message, 404, { code: 'NOT_FOUND' });
  }

  public static conflict(res: Response, message = 'Resource conflict'): Response {
    return ApiResponse.error(res, message, 409, { code: 'CONFLICT' });
  }

  public static unprocessable(res: Response, message = 'Unprocessable entity', errors?: any): Response {
    return ApiResponse.error(res, message, 422, { code: 'UNPROCESSABLE_ENTITY', errors });
  }
}

/**
 * Functional helpers for direct importing
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: Record<string, unknown>
) => ApiResponse.success(res, data, message, statusCode, meta);

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully',
  meta?: Record<string, unknown>
) => ApiResponse.created(res, data, message, meta);

export const sendError = (
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  options: ApiErrorOptions = {}
) => ApiResponse.error(res, message, statusCode, options);

/**
 * Express middleware to attach helpers directly to `res` object
 */
export function responseEnhancer(req: Request, res: Response, next: NextFunction): void {
  (res as any).success = (data: any, message?: string, statusCode?: number, meta?: Record<string, unknown>) =>
    ApiResponse.success(res, data, message, statusCode, meta);

  (res as any).created = (data: any, message?: string, meta?: Record<string, unknown>) =>
    ApiResponse.created(res, data, message, meta);

  (res as any).error = (message: string, statusCode?: number, options?: ApiErrorOptions) =>
    ApiResponse.error(res, message, statusCode, options);

  next();
}

