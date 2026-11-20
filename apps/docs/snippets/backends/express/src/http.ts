import type { Issue } from '@builderset/engine';
import type { ErrorRequestHandler, Request } from 'express';

import { isUniqueViolation } from './db';

/**
 * Handlers throw an HttpError and this file turns it into the answer. Express 5
 * passes a rejected async handler to the error middleware by itself, so the
 * routes need no wrapper and no try/catch of their own.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const notFound = (noun: string) => new HttpError(404, `There is no such ${noun}.`);
export const conflict = (message: string) => new HttpError(409, message);
export const forbidden = (message: string) => new HttpError(403, message);

/** 422 with the issue codes, so the editor shows each problem on its block. */
export const refused = (issues: Issue[]) =>
  new HttpError(422, 'Refused: see the issues.', { issues });

/** The one place an error becomes an answer. */
export const errorHandler: ErrorRequestHandler = (failure: unknown, _req, res, _next) => {
  if (failure instanceof HttpError) {
    res.status(failure.status).json({ message: failure.message, ...failure.body });
    return;
  }
  // A restore whose address another live row took meanwhile.
  if (isUniqueViolation(failure)) {
    res.status(409).json({ message: 'Another live row has its address now.' });
    return;
  }
  // express.json() and express.raw() refuse a body that is too large (413) or not JSON (400).
  if (isClientError(failure)) {
    res.status(failure.status).json({ message: failure.message });
    return;
  }
  console.error(failure);
  res.status(500).json({ message: 'Something went wrong.' });
};

function isClientError(failure: unknown): failure is { status: number; message: string } {
  if (typeof failure !== 'object' || failure === null) return false;
  const { status } = failure as { status?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500;
}

// ── Reading a request ────────────────────────────────────────────────────────

export type Body = Record<string, unknown>;

export const bodyOf = (req: Request): Body =>
  typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)
    ? (req.body as Body)
    : {};

/** A string of at most `max` characters, or null. */
export const textOf = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.length <= max ? value : null;

/** An instant the client sent, or null when there is none or it is not a date. */
export function instantOf(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** `?limit=&offset=`: a page of at most 100 rows. */
export function pageOf(query: Request['query'], defaultLimit = 50) {
  const limit = Number(query.limit ?? defaultLimit);
  const offset = Number(query.offset ?? 0);
  return {
    limit: Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : defaultLimit,
    offset: Number.isInteger(offset) ? Math.max(offset, 0) : 0,
  };
}

/** Whether `value` is one of a list of constants: a status, a kind. */
export const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);
