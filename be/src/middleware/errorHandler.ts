import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const status = err.status || err.statusCode || 500;
  const title = err.title || (status === 500 ? 'Internal Server Error' : 'Request Error');
  const detail = err.message || 'An unexpected error occurred processing your request.';

  console.error(`[API Error] ${req.method} ${req.originalUrl} - Status: ${status} - Error:`, err);

  res.status(status).json({
    type: err.type || 'https://api.icd.dcc/errors/internal-error',
    title,
    status,
    detail,
    instance: req.originalUrl,
    timestamp: new Date().toISOString()
  });
}
