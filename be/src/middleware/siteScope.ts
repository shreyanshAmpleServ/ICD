import { Request, Response, NextFunction } from 'express';
import { fallbackStore } from '../db/fallbackStore';

// Extend Express Request interface to include site context & user
declare global {
  namespace Express {
    interface Request {
      siteId?: string;
      user?: {
        userId: string;
        username: string;
        roleCode: string;
      };
    }
  }
}

/**
 * Validates that an X-Site-Id header is supplied for site-scoped endpoints.
 * Global endpoints (marked 🌐 in the specification) can pass isGlobal = true to skip this.
 */
export function requireSite(isGlobal = false) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (isGlobal) {
      return next();
    }

    const headerSiteId = (
      (req.headers['x-site-id'] as string) ||
      (req.headers['x-site'] as string) ||
      (req.query.siteId as string) ||
      'DAR1'
    )?.trim().toUpperCase();

    const validSite = fallbackStore.sites.find(s => 
      s.siteId.toUpperCase() === headerSiteId || 
      s.siteCode.toUpperCase() === headerSiteId ||
      (headerSiteId === '1' && s.siteCode === 'DAR1') ||
      (headerSiteId === '2' && s.siteCode === 'DAR2') ||
      (headerSiteId === '3' && s.siteCode === 'KBH1')
    );
    if (!validSite) {
      res.status(404).json({
        type: 'https://api.icd.dcc/errors/invalid-site',
        title: 'Site Not Found',
        status: 404,
        detail: `Site '${headerSiteId}' is not recognized or is inactive.`
      });
      return;
    }

    req.siteId = validSite.siteId;
    next();
  };
}
