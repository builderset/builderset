// The database, as every function reaches it. Deno, as Supabase's Edge Functions run it.
import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Set by Supabase in every Edge Function. */
function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

/**
 * The service role: past Row Level Security, and the only role that may write
 * (08_security.sql). The functions use it only after their own checks, so
 * every document in the tables went through a kit's check. It has no user of
 * its own, so every write names the signed-in user as `p_actor`.
 */
export const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

/**
 * The anon key: what the public may read, and only that. The popups function
 * reads the live popups through it, so Row Level Security (10_popups.sql) is
 * the filter, not a where clause that could be forgotten.
 */
export const visitor = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
  auth: { persistSession: false },
});

/** What a query answered, or its error thrown: the router turns it into the answer. */
export function rowsOf<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

/** The functions of 07_writes.sql, 09_cards.sql and 10_popups.sql. Each call is one transaction. */
export type WriteFunction =
  | 'create_document'
  | 'save_draft'
  | 'publish_document'
  | 'unpublish_document'
  | 'save_revision'
  | 'soft_delete'
  | 'restore_deleted'
  | 'create_section'
  | 'record_media'
  | 'record_form_response'
  | 'triage_response'
  | 'issue_card'
  | 'revoke_card'
  | 'pause_popup'
  | 'record_popup_submission';

/** One write: the row, its revision and its activity together, or nothing. */
export async function write<T>(fn: WriteFunction, args: Record<string, unknown>): Promise<T> {
  return rowsOf<T>(await admin.rpc(fn, args));
}
