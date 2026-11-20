import pg from 'pg';

// The schema's ids are bigint, which pg hands back as strings in case they
// pass 2^53. A site's own rows never get near that, so they come back as numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

/** One pool per process. The tables are the ones in schema.sql. */
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

/** Run `work` in one transaction: every query in it is written, or none is. */
export async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

/** Postgres refused a duplicate: a slug already taken. */
export const isUniqueViolation = (error: unknown) =>
  error instanceof pg.DatabaseError && error.code === '23505';
