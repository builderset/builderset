import type { NextFunction, Request, Response } from 'express';

import { pool } from './db';
import { forbidden, HttpError } from './http';

/** The signed-in person, as the routes need them. `id` is app_user.id, for the audit columns. */
export interface User {
  id: number;
  uuid: string;
  name: string;
  /** Publishing is its own permission: a draft and a page in front of readers are different trust. */
  canPublish: boolean;
}

// Express's own way to type what a middleware puts on the request.
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// ── Your auth here ───────────────────────────────────────────────────────────
// A stand-in so the example runs: it signs your team's requests in as the user
// whose email is in DEV_USER_EMAIL, and leaves the public routes to visitors,
// who are signed out. Replace it with your session (express-session, Passport,
// a JWT check) setting `req.user` the same way, with your own rule for who may
// publish.
export async function session(req: Request, _res: Response, next: NextFunction) {
  const email = process.env.DEV_USER_EMAIL;
  if (email && !req.path.startsWith('/api/public/')) {
    const { rows } = await pool.query<Omit<User, 'canPublish'>>(
      'select id, uuid, name from app_user where email = $1',
      [email],
    );
    if (rows[0]) req.user = { ...rows[0], canPublish: true };
  }
  next();
}
// ─────────────────────────────────────────────────────────────────────────────

/** The signed-in user; 401 when there is none. */
export function currentUser(req: Request): User {
  if (!req.user) throw new HttpError(401, 'Sign in to edit.');
  return req.user;
}

/** In front of every route of your team's: visitors stop here. */
export function signedIn(req: Request, _res: Response, next: NextFunction) {
  currentUser(req);
  next();
}

/** The signed-in user, who must also be allowed to publish. */
export function publisher(req: Request): User {
  const user = currentUser(req);
  if (!user.canPublish) throw forbidden('You may not publish.');
  return user;
}
