import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
  // Read by `prisma migrate`. `prisma generate` needs no database, so it runs
  // without one: in CI's type check, say.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
