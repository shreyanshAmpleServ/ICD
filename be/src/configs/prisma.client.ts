import { getPrisma } from './prisma';

// Proxy prisma client to lazily call getPrisma()
export const prisma = new Proxy({} as any, {
  get(_target, prop) {
    const client = getPrisma();
    if (!client) {
      throw new Error('[Prisma Client] Database connection is not available');
    }
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

export default prisma;
