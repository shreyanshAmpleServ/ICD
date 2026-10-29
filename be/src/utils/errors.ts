export interface InvalidParamDetail {
  name: string;
  reason: string;
  path?: string;
}

export interface AppErrorOptions {
  status?: number;
  statusCode?: number;
  code?: string;
  title?: string;
  type?: string;
  detail?: string;
  invalidParams?: InvalidParamDetail[];
  meta?: Record<string, unknown>;
  isOperational?: boolean;
}

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly title: string;
  public readonly type: string;
  public readonly detail: string;
  public readonly isOperational: boolean;
  public readonly invalidParams?: InvalidParamDetail[];
  public readonly meta?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = options.status ?? options.statusCode ?? 500;
    this.statusCode = this.status;
    this.code = options.code ?? (this.status === 500 ? 'INTERNAL_SERVER_ERROR' : 'APPLICATION_ERROR');
    this.title = options.title ?? (this.status === 500 ? 'Internal Server Error' : 'Request Error');
    this.type = options.type ?? `https://api.icd.dcc/errors/${this.code.toLowerCase().replace(/_/g, '-')}`;
    this.detail = options.detail ?? message;
    this.invalidParams = options.invalidParams;
    this.meta = options.meta;
    this.isOperational = options.isOperational ?? true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'The request could not be understood or was missing required parameters.', options: AppErrorOptions = {}) {
    super(message, {
      status: 400,
      code: 'BAD_REQUEST',
      title: 'Bad Request',
      type: 'https://api.icd.dcc/errors/bad-request',
      ...options
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication credentials are required or invalid.', options: AppErrorOptions = {}) {
    super(message, {
      status: 401,
      code: 'UNAUTHORIZED',
      title: 'Unauthorized',
      type: 'https://api.icd.dcc/errors/unauthorized',
      ...options
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.', options: AppErrorOptions = {}) {
    super(message, {
      status: 403,
      code: 'FORBIDDEN',
      title: 'Forbidden',
      type: 'https://api.icd.dcc/errors/forbidden',
      ...options
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', idOrIdentifier?: string | number, options: AppErrorOptions = {}) {
    const detail = idOrIdentifier !== undefined 
      ? `${resource} with identifier '${idOrIdentifier}' was not found.`
      : `${resource} was not found.`;
    
    super(detail, {
      status: 404,
      code: 'NOT_FOUND',
      title: 'Resource Not Found',
      type: 'https://api.icd.dcc/errors/not-found',
      detail,
      ...options
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'A conflict occurred with current state of the resource.', options: AppErrorOptions = {}) {
    super(message, {
      status: 409,
      code: 'CONFLICT',
      title: 'Conflict',
      type: 'https://api.icd.dcc/errors/conflict',
      ...options
    });
  }
}

export class PreconditionFailedError extends AppError {
  constructor(message = 'Resource state precondition failed (e.g., version mismatch).', options: AppErrorOptions = {}) {
    super(message, {
      status: 412,
      code: 'PRECONDITION_FAILED',
      title: 'Precondition Failed',
      type: 'https://api.icd.dcc/errors/concurrency-precondition-failed',
      ...options
    });
  }
}

export class ValidationError extends AppError {
  constructor(invalidParams: InvalidParamDetail[] = [], message = 'One or more request parameters failed validation.', options: AppErrorOptions = {}) {
    super(message, {
      status: 422,
      code: 'VALIDATION_FAILED',
      title: 'Validation Failed',
      type: 'https://api.icd.dcc/errors/validation-failed',
      invalidParams,
      ...options
    });
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected internal error occurred.', options: AppErrorOptions = {}) {
    super(message, {
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      title: 'Internal Server Error',
      type: 'https://api.icd.dcc/errors/internal-error',
      isOperational: false,
      ...options
    });
  }
}

