import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/AppError';
import { formatZodError } from '../common/validation/validate';
import { ENV } from '../config/env';

/**
 * Global Error Handler Middleware
 * Implements RFC 7807 Problem Details for HTTP APIs
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.setHeader('Content-Type', 'application/problem+json');

  // 1. Default Error State
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorTitle = 'Internal Server Error';
  let errorDetail = 'An unexpected error occurred while processing your request.';
  let errorType = 'https://api.icd.dcc/errors/internal-error';
  let invalidParams: Array<{ name: string; reason: string; path?: string }> | undefined = undefined;
  let meta: Record<string, unknown> | undefined = undefined;

  // 2. Classify Known Error Types

  // (a) AppError and its subclasses (NotFoundError, ValidationError, ForbiddenError, etc.)
  if (err instanceof AppError) {
    statusCode = err.status;
    errorCode = err.code;
    errorTitle = err.title;
    errorType = err.type;
    errorDetail = err.detail;
    invalidParams = err.invalidParams;
    meta = err.meta;
  }
  // (b) Direct Zod Validation Error
  else if (err instanceof ZodError) {
    statusCode = 422;
    errorCode = 'VALIDATION_FAILED';
    errorTitle = 'Validation Failed';
    errorType = 'https://api.icd.dcc/errors/validation-failed';
    errorDetail = 'One or more request parameters failed validation.';
    invalidParams = formatZodError(err);
  }
  // (c) Malformed JSON syntax error in body-parser
  else if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'BAD_JSON_SYNTAX';
    errorTitle = 'Invalid JSON Body';
    errorType = 'https://api.icd.dcc/errors/bad-json-syntax';
    errorDetail = 'Malformed JSON payload received in request body.';
  }
  // (d) Prisma Client Known Request Errors (MSSQL)
  else if (err?.constructor?.name === 'PrismaClientKnownRequestError' || (typeof err?.code === 'string' && err.code.startsWith('P'))) {
    if (err.code === 'P2002') {
      statusCode = 409;
      errorCode = 'RECORD_ALREADY_EXISTS';
      errorTitle = 'Conflict';
      errorType = 'https://api.icd.dcc/errors/conflict';
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      errorDetail = `A record with this ${target} already exists.`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
      errorTitle = 'Record Not Found';
      errorType = 'https://api.icd.dcc/errors/not-found';
      errorDetail = (err.meta?.cause as string) || 'The requested database record does not exist.';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      errorCode = 'FOREIGN_KEY_VIOLATION';
      errorTitle = 'Foreign Key Constraint Failed';
      errorType = 'https://api.icd.dcc/errors/foreign-key-violation';
      errorDetail = 'The referenced foreign entity does not exist.';
    } else {
      statusCode = 500;
      errorCode = 'DATABASE_ERROR';
      errorTitle = 'Database Query Error';
      errorType = 'https://api.icd.dcc/errors/database-error';
      errorDetail = ENV.NODE_ENV === 'production' ? 'Database operation failed.' : (err.message || 'Database error');
    }
  }
  // (e) Generic Error with status or statusCode property
  else if (typeof err?.status === 'number' || typeof err?.statusCode === 'number') {
    statusCode = err.status || err.statusCode;
    errorTitle = err.title || (statusCode >= 500 ? 'Internal Server Error' : 'Request Error');
    errorDetail = err.message || errorDetail;
    errorType = err.type || `https://api.icd.dcc/errors/http-${statusCode}`;
    errorCode = err.code || `HTTP_${statusCode}`;
  }
  // (f) Standard unhandled Error
  else if (err instanceof Error) {
    errorDetail = ENV.NODE_ENV === 'production' ? errorDetail : err.message;
  }

  // 3. Structured Logging
  const logMethod = statusCode >= 500 ? console.error : console.warn;
  logMethod(
    `[API Error] ${req.method} ${req.originalUrl} - HTTP ${statusCode} [${errorCode}]:`,
    err?.stack || err?.message || err
  );

  // 4. Send RFC 7807 Response
  const responsePayload: Record<string, unknown> = {
    type: errorType,
    title: errorTitle,
    status: statusCode,
    code: errorCode,
    detail: errorDetail,
    instance: req.originalUrl,
    timestamp: new Date().toISOString()
  };

  if (invalidParams && invalidParams.length > 0) {
    responsePayload.invalidParams = invalidParams;
  }

  if (meta) {
    responsePayload.meta = meta;
  }

  if (ENV.NODE_ENV !== 'production' && statusCode >= 500 && err?.stack) {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
}
