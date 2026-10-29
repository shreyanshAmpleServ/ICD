import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { ValidationError, InvalidParamDetail } from "../errors/AppError";

export interface RequestValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
  headers?: ZodTypeAny;
}

export function formatZodError(
  error: ZodError,
  targetPrefix?: string,
): InvalidParamDetail[] {
  return error.errors.map((issue) => {
    const fieldPath = issue.path.join(".");
    const fullPath = targetPrefix
      ? fieldPath
        ? `${targetPrefix}.${fieldPath}`
        : targetPrefix
      : fieldPath;

    const fieldName =
      issue.path.length > 0
        ? String(issue.path[issue.path.length - 1])
        : targetPrefix || "value";

    return {
      name: fieldName,
      reason: issue.message,
      path: fullPath,
    };
  });
}

export function validateRequest(
  schemas: RequestValidationSchemas,
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const invalidParams: InvalidParamDetail[] = [];

    // 1. Validate URL Params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        invalidParams.push(...formatZodError(result.error, "params"));
      } else {
        req.params = result.data as any;
      }
    }

    // 2. Validate Query Parameters
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        invalidParams.push(...formatZodError(result.error, "query"));
      } else {
        req.query = result.data as any;
      }
    }

    // 3. Validate Request Body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        invalidParams.push(...formatZodError(result.error, "body"));
      } else {
        req.body = result.data;
      }
    }

    // 4. Validate Headers if specified
    if (schemas.headers) {
      const result = schemas.headers.safeParse(req.headers);
      if (!result.success) {
        invalidParams.push(...formatZodError(result.error, "headers"));
      }
    }

    if (invalidParams.length > 0) {
      return next(new ValidationError(invalidParams));
    }

    next();
  };
}

/**
 * Shorthand helper for body validation
 */
export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validateRequest({ body: schema });
}

/**
 * Shorthand helper for query string validation
 */
export function validateQuery<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validateRequest({ query: schema });
}

/**
 * Shorthand helper for route param validation
 */
export function validateParams<T extends ZodTypeAny>(
  schema: T,
): RequestHandler {
  return validateRequest({ params: schema });
}
