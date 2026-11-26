import { Request, Response } from "express";
import { getPrisma } from "../../../db/prisma";
import { search as mockSearch } from "../../../data/search";

export const searchController = {
  globalSearch: async (req: Request, res: Response) => {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 1) {
      return res.json({ query: q, groups: [], results: [], total: 0 });
    }

    const normQ = q.replace(/[\s-]/g, "");
    const prisma = getPrisma();
    const groups: any[] = [];

    try {
      const mockResults = mockSearch(q) || [];
      const total = mockResults.reduce(
        (acc: number, g: any) => acc + (g.hits?.length || 0),
        0,
      );
      return res.json({
        query: q,
        groups: mockResults,
        results: mockResults,
        total,
      });
    } catch {
      return res.json({
        query: q,
        groups: [],
        results: [],
        total: 0,
      });
    }
  },
};
