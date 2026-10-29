import { Request, Response, NextFunction } from 'express';

// In-memory cache for idempotency keys (stores response status & body)
const idempotencyCache = new Map<string, { status: number; body: any }>();

/**
 * Checks and enforces Idempotency-Key header for non-safe mutation operations (POST/PUT/PATCH).
 */
export function requireIdempotency(isMandatory = false) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.headers['idempotency-key'] as string;

    if (isMandatory && !key) {
      res.status(400).json({
        type: 'https://api.icd.dcc/errors/missing-idempotency-key',
        title: 'Missing Idempotency-Key',
        status: 400,
        detail: 'An Idempotency-Key header is required for this operation to prevent duplicate execution.'
      });
      return;
    }

    if (key && idempotencyCache.has(key)) {
      const cached = idempotencyCache.get(key)!;
      res.setHeader('X-Cache-Lookup', 'HIT');
      res.status(cached.status).json(cached.body);
      return;
    }

    // Intercept response to cache on completion
    if (key) {
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          idempotencyCache.set(key, { status: res.statusCode, body });
        }
        return originalJson(body);
      };
    }

    next();
  };
}

/**
 * Optimistic concurrency control via If-Match header (compares logInst).
 */
export function verifyIfMatch(currentLogInst: number, req: Request, res: Response): boolean {
  const ifMatchHeader = req.headers['if-match'];
  if (!ifMatchHeader) {
    // If not sent, can either warn or pass depending on strict mode
    return true;
  }

  const expectedInst = parseInt(String(ifMatchHeader).replace(/"/g, ''), 10);
  if (!isNaN(expectedInst) && expectedInst !== currentLogInst) {
    res.status(412).json({
      type: 'https://api.icd.dcc/errors/concurrency-precondition-failed',
      title: 'Precondition Failed',
      status: 412,
      detail: `Record has been modified by another transaction. Expected logInst: ${expectedInst}, current: ${currentLogInst}.`
    });
    return false;
  }

  return true;
}
