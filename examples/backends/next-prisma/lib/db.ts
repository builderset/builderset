import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';

// One client, and one pool of connections to DATABASE_URL, per server. Next's
// dev server runs this module again after every change: keeping the client on
// globalThis stops each run from opening another pool.
const server = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = (server.prisma ??= new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
}));
