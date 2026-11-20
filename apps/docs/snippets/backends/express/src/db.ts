import pg from 'pg';

// The schema's ids are bigint, which pg hands back as strings in case they
// pass 2^53. A site's own rows never get near that, so they come back as numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);
// A card's size in millimetres is numeric(6, 2): exact, and well inside a number.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);
// A date is a day, not an instant: `2027-12-31` stays that text, in no time zone.
pg.types.setTypeParser(pg.types.builtins.DATE, (day) => day);

/** One pool per process, over the tables of the SQL schema. */
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

/** The pool, or a client inside a transaction: every helper takes either. */
export type Db = pg.Pool | pg.PoolClient;

/** Columns by name. Names always come from this code; values are always parameters. */
export type Columns = Record<string, unknown>;

/** Run `work` in one transaction: every query in it is written, or none is. */
export async function transaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (failure) {
    await client.query('rollback');
    throw failure;
  } finally {
    client.release();
  }
}

/** `insert into <table> (…) values (…) returning *`. */
export async function insertRow<R extends pg.QueryResultRow>(
  db: Db,
  table: string,
  columns: Columns,
): Promise<R> {
  const names = Object.keys(columns);
  const slots = names.map((_, index) => `$${String(index + 1)}`);
  const { rows } = await db.query<R>(
    `insert into ${table} (${names.join(', ')}) values (${slots.join(', ')}) returning *`,
    Object.values(columns),
  );
  return rows[0];
}

/** `update <table> set … where id = … returning *`, by the row's internal id. */
export async function updateRow<R extends pg.QueryResultRow>(
  db: Db,
  table: string,
  id: number,
  columns: Columns,
): Promise<R> {
  const names = Object.keys(columns);
  const assignments = names.map((name, index) => `${name} = $${String(index + 2)}`);
  const { rows } = await db.query<R>(
    `update ${table} set ${assignments.join(', ')} where id = $1 returning *`,
    [id, ...Object.values(columns)],
  );
  return rows[0];
}

/**
 * Postgres refused a duplicate: an address a partial unique index already
 * holds. With `index`, only a refusal by that index.
 */
export const isUniqueViolation = (failure: unknown, index?: string) =>
  failure instanceof pg.DatabaseError &&
  failure.code === '23505' &&
  (index === undefined || failure.constraint === index);
