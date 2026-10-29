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

export {};

