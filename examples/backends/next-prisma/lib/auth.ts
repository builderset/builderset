import type { AppUser } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { isUuid, unauthorized } from '@/lib/http';

/**
 * The signed-in user. YOUR AUTH HERE: this stand-in trusts an `X-User-Id`
 * header holding a user's uuid, so the example runs without a login. Never
 * ship it; read your session (Auth.js, Clerk, your own cookie) instead and
 * return the same row.
 */
export async function currentUser(request: Request): Promise<AppUser> {
  const id = request.headers.get('x-user-id') ?? '';
  if (!isUuid(id)) throw unauthorized();
  const user = await prisma.appUser.findUnique({ where: { uuid: id } });
  if (!user) throw unauthorized();
  return user;
}
