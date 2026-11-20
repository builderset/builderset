// Requests in, answers out: the same for both functions.

export type Json = Record<string, unknown>;

// The editor and the form's page call from your site's origin.
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

export const noContent = () => new Response(null, { status: 204, headers: cors });

/** A refusal with its status. Thrown anywhere; `answerError` turns it into the answer. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: Json = { message },
  ) {
    super(message);
  }
}

export const notFound = (what = 'page') => new HttpError(404, `There is no such ${what}.`);

/** Postgres's code for a row a unique index refused: an address already taken. */
export const UNIQUE_VIOLATION = '23505';

interface PostgresError {
  code: string;
  message: string;
}

export function isPostgresError(error: unknown): error is PostgresError {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as Partial<PostgresError>;
  return typeof code === 'string' && typeof message === 'string';
}

/**
 * The one place an error becomes an answer. The write functions raise PT404
 * and PT409, which PostgREST hands back as the error's code with their own
 * message; a unique index refuses with 23505.
 */
export function answerError(error: unknown): Response {
  if (error instanceof HttpError) return json(error.body, error.status);
  if (isPostgresError(error)) {
    const custom = /^PT(\d{3})$/.exec(error.code);
    if (custom) return json({ message: error.message }, Number(custom[1]));
    if (error.code === UNIQUE_VIOLATION) return json({ message: 'That address is taken.' }, 409);
  }
  console.error(error);
  return json({ message: 'Something went wrong on our side.' }, 500);
}

/** The largest JSON body: a document is any size until it is checked. */
const MAX_JSON_BYTES = 2_000_000;

/** The body as an object; an empty object when there is none or it is not JSON. */
export async function readJson(request: Request): Promise<Json> {
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new HttpError(413, 'The document is too large.');
  try {
    const body: unknown = JSON.parse(text);
    return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Json) : {};
  } catch {
    return {};
  }
}

/** The path after the function's name: /documents/articles/<id>/draft → articles, <id>, draft. */
export function segmentsAfter(request: Request, functionName: string): string[] {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  return segments.slice(segments.indexOf(functionName) + 1);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Params = Record<string, string>;

/**
 * The params of a path like `:kind/:id/draft`, or null when it does not match.
 * A param named `id` or `…Id` must be a uuid: anything else is no route, rather
 * than a database error.
 */
export function matchPath(pattern: string, segments: readonly string[]): Params | null {
  const parts = pattern.split('/');
  if (parts.length !== segments.length) return null;
  const params: Params = {};
  for (const [index, part] of parts.entries()) {
    const segment = segments[index] ?? '';
    if (!part.startsWith(':')) {
      if (part !== segment) return null;
      continue;
    }
    const name = part.slice(1);
    if ((name === 'id' || name.endsWith('Id')) && !UUID.test(segment)) return null;
    params[name] = segment;
  }
  return params;
}

/** A whole number from the query string, kept between its bounds. */
export function intParam(
  query: URLSearchParams,
  name: string,
  { fallback, min, max }: { fallback: number; min: number; max: number },
): number {
  const value = Number.parseInt(query.get(name) ?? '', 10);
  return Number.isNaN(value) ? fallback : Math.min(Math.max(value, min), max);
}

/** A time from the body, or null when there is none; a 400 when it is not a time. */
export function timeParam(body: Json, name: string): string | null {
  const value = body[name];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
    throw new HttpError(400, `${name} is not a time.`);
  return value;
}
