import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

/**
 * A real Postgres for the tests: the one in TEST_DATABASE_URL when it is set
 * (CI starts one as a service), otherwise a new one in a container. Never
 * DATABASE_URL: the tests write rows, and that may be a database you care about.
 * The migrations in drizzle/ create the table, as they would in production.
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
  const db = drizzle({ connection: { connectionString: url } });
  await migrate(db, { migrationsFolder: 'drizzle' });
  await db.$client.end();
  return async () => {
    await container?.stop();
  };
}
