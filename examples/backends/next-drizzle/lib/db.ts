import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';

// A pool of connections to DATABASE_URL, shared by every route.
export const db = drizzle({ connection: { connectionString: process.env.DATABASE_URL }, schema });
