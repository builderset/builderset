import { execSync } from 'node:child_process';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * A real Postgres for the tests: the one in TEST_DATABASE_URL when it is set
 * (CI starts one as a service), otherwise a new one in a container. Never
 * DATABASE_URL: the tests write rows, and that may be a database you care about.
 * `prisma migrate deploy` creates the table, as it would in production.
 */
export default async function setup() {
  let container: StartedPostgreSqlContainer | undefined;
  let url = process.env.TEST_DATABASE_URL;
  if (!url) {
    container = await new PostgreSqlContainer('postgres:18-alpine').start();
    url = container.getConnectionUri();
  }
  // The routes read DATABASE_URL; the test workers start after this and inherit it.
  process.env.DATABASE_URL = url;
  execSync('prisma migrate deploy', { stdio: 'inherit' });
  return async () => {
    await container?.stop();
  };
}
