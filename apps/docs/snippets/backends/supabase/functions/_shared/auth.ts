// Who is calling. The functions hold the service role, for which Postgres sees
// no user (auth.uid() is null), so they find out themselves, from the token.
import { HttpError } from './http.ts';
import { admin, rowsOf } from './supabase.ts';

/** A row in profiles makes a user part of the team; publishing is its own permission. */
export const Role = { editor: 'editor', publisher: 'publisher' } as const;
export type Role = (typeof Role)[keyof typeof Role];

/** A signed-in member of the team: the actor every write names. */
export interface Member {
  id: string;
  role: Role;
}

/** The signed-in user's id, or null: the anon key is a token too, but of no user. */
export async function userIdOf(request: Request): Promise<string | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

/** The caller, who must be on the team: a 401 otherwise. */
export async function requireMember(request: Request): Promise<Member> {
  const userId = await userIdOf(request);
  const profile = userId
    ? rowsOf<{ role: Role } | null>(
        await admin.from('profiles').select('role').eq('id', userId).maybeSingle(),
      )
    : null;
  if (!userId || !profile) throw new HttpError(401, 'Sign in as a member of the team.');
  return { id: userId, role: profile.role };
}

export function requirePublisher(member: Member): void {
  if (member.role !== Role.publisher) throw new HttpError(403, 'You may not publish.');
}
