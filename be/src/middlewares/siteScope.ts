import { Request, Response, NextFunction } from "express";
import { fallbackStore } from "../data/fallbackStore";

export function requireSite(isGlobal = false) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (isGlobal) {
      return next();
    }

    const headerSiteId = (
      (req.headers["x-site-id"] as string) ||
      (req.headers["x-site"] as string) ||
      (req.query.siteId as string) ||
      "DAR1"
    )
      ?.trim()
      .toUpperCase();

    const validSite = fallbackStore.sites.find(
      (s) =>
        s.siteId.toUpperCase() === headerSiteId ||
        s.siteCode.toUpperCase() === headerSiteId ||
        (headerSiteId === "1" && s.siteCode === "DAR1") ||
        (headerSiteId === "2" && s.siteCode === "DAR2") ||
        (headerSiteId === "3" && s.siteCode === "KBH1"),
    );
    if (!validSite) {
      res.status(404).json({
        type: "https://api.icd.dcc/errors/invalid-site",
        title: "Site Not Found",
        status: 404,
        detail: `Site '${headerSiteId}' is not recognized or is inactive.`,
      });
      return;
    }

    req.siteId = validSite.siteId;
    next();
  };
}
