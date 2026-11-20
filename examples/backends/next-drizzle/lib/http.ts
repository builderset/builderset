// The one place an error becomes an HTTP answer. Services throw `HttpError`;
// `route` turns it, or a unique index's refusal, into the response.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    super(typeof body.message === 'string' ? body.message : `HTTP ${String(status)}`);
  }
}

export const badRequest = (message: string) => new HttpError(400, { message });
export const unauthorized = () => new HttpError(401, { message: 'Sign in first.' });
export const notFound = () => new HttpError(404, { message: 'There is no such email template.' });
export const conflict = (message: string) => new HttpError(409, { message });
/** A refused document: the editor shows each issue on its block. */
export const refused = (issues: unknown[]) => new HttpError(422, { issues });

/** Postgres refused a row a unique index already has: two people published at once, say. */
function isUniqueViolation(error: unknown): boolean {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if ((cause as { code?: unknown }).code === '23505') return true;
  }
  return false;
}

/**
 * A route handler that may throw. `params` arrives resolved; an `HttpError`
 * becomes its answer, anything else a 500 that Next logs.
 */
export function route<Params extends Record<string, string | string[]> = Record<string, never>>(
  handler: (request: Request, params: Params) => Promise<Response>,
) {
  return async (request: Request, context: { params: Promise<Params> }): Promise<Response> => {
    try {
      return await handler(request, await context.params);
    } catch (error) {
      if (error instanceof HttpError) return Response.json(error.body, { status: error.status });
      if (isUniqueViolation(error))
        return Response.json({ message: 'Someone else changed this just now.' }, { status: 409 });
      throw error;
    }
  };
}

/** The request's JSON body, as an object. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  if (body === null || typeof body !== 'object' || Array.isArray(body))
    throw badRequest('Send a JSON object.');
  return body as Record<string, unknown>;
}

/** An optional text field: trimmed, null when empty, refused when too long. */
export function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.trim().length > maxLength)
    throw badRequest(`\`${field}\` is text of at most ${String(maxLength)} characters.`);
  return value.trim() || null;
}

/** An optional instant, sent as an ISO string. */
export function optionalInstant(value: unknown, field: string): Date | null {
  if (value === undefined || value === null) return null;
  const instant = typeof value === 'string' ? new Date(value) : null;
  if (!instant || Number.isNaN(instant.getTime()))
    throw badRequest(`\`${field}\` is an ISO date and time.`);
  return instant;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether an id from a URL can be a row's uuid; anything else is a 404 without asking Postgres. */
export const isUuid = (value: string) => UUID.test(value);

/** `?limit=` and `?offset=`, within bounds. */
export function pageOf(url: URL, defaultLimit = 50, maxLimit = 200) {
  const number = (name: string, fallback: number) => {
    const value = Number.parseInt(url.searchParams.get(name) ?? '', 10);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  return {
    limit: Math.min(Math.max(number('limit', defaultLimit), 1), maxLimit),
    offset: number('offset', 0),
  };
}
