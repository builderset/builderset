// What every route of the documents function is handed, and the read they all start with.
import type { Member } from '../_shared/auth.ts';
import { notFound, type Json, type Params } from '../_shared/http.ts';
import { admin, rowsOf } from '../_shared/supabase.ts';
import type { Kind } from './kinds.ts';

export interface Call {
  request: Request;
  /** The signed-in member of the team: the actor of every write. */
  member: Member;
  params: Params;
  query: URLSearchParams;
  /** The JSON body; empty for a GET or a file. */
  body: Json;
  /** The builder the path's `:kind` names: a 404 when it names none. */
  readonly kind: Kind;
}

/** A live document's columns, by its uuid. A deleted one is a 404, like a missing one. */
export async function liveDocument<T extends Json>(
  kind: Kind,
  id: string,
  columns: string,
): Promise<T> {
  const row = rowsOf<T | null>(
    await admin
      .from(kind.table)
      .select(columns)
      .eq('uuid', id)
      .is('deleted_at', null)
      .maybeSingle(),
  );
  if (!row) throw notFound(kind.noun);
  return row;
}
