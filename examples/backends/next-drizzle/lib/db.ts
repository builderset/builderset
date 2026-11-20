import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';

// A pool of connections to DATABASE_URL, shared by every route.
export const db = drizzle({ connection: { connectionString: process.env.DATABASE_URL }, schema });

/** What `db.transaction` hands its callback: every write of one request goes through it. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
