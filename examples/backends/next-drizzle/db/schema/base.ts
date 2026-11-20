import { isNull, sql, type SQL } from 'drizzle-orm';
import {
  bigint,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
  type ExtraConfigColumn,
  type PgColumn,
} from 'drizzle-orm/pg-core';

/**
 * Your users. The schema only needs `id`: point `userRef` at your own table
 * and drop this one.
 */
export const appUser = pgTable('app_user', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  uuid: uuid('uuid').notNull().unique().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AppUser = typeof appUser.$inferSelect;

/** The row, for joins. Never leaves the server: answers show `uuid`. */
export const rowId = () =>
  bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity();

/** A person. Removing them keeps everything they made, without their name on it. */
export const userRef = (name: string) =>
  bigint(name, { mode: 'number' }).references((): AnyPgColumn => appUser.id, {
    onDelete: 'set null',
  });

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * Who made the row, who last changed it and who deleted it, and when. Spread
 * into every table. The server sets the `*_by_id` columns from the signed-in
 * user, never from the request.
 */
export const auditColumns = () => ({
  uuid: uuid('uuid').notNull().unique().defaultRandom(),
  createdAt: instant('created_at').notNull().defaultNow(),
  createdById: userRef('created_by_id'),
  // Follows every write through Drizzle, whatever it changes.
  updatedAt: instant('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  updatedById: userRef('updated_by_id'),
  deletedAt: instant('deleted_at'),
  deletedById: userRef('deleted_by_id'),
});

/** Live rows only. Every query on a table with `deleted_at` uses it, except the trash. */
export const isLive = (table: { deletedAt: PgColumn }) => isNull(table.deletedAt);

/** A check that a text column holds one of a list of values: `status in ('draft', …)`. */
export const oneOf = (column: PgColumn, values: readonly string[]): SQL =>
  sql`${column} in ${sql.raw(`(${values.map((value) => `'${value}'`).join(', ')})`)}`;

/**
 * An index column newest first, in Postgres's own order for `desc` (nulls
 * first, which Drizzle does not default to): an `order by … desc` then reads
 * the index as it is.
 */
export const newestFirst = (column: ExtraConfigColumn) => column.desc().nullsFirst();
