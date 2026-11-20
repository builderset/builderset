import type { EngineDocument } from '@builderset/engine';
import { createRestHost } from '@builderset/engine/host';
import type { FormResponses } from '@builderset/form/editor';
import type { FormSubmission } from '@builderset/form/render';

/** The three builders' routes differ only in this segment: /api/emails/<uuid>, /api/forms/<uuid>. */
export type DocumentKind = 'emails' | 'articles' | 'forms';

/**
 * The editor's host for a backend built from the data model: the same for
 * emails, articles and forms. `id` is the row's uuid, its public id; `savedAt`
 * is the row's, as the page loaded it: the first save sends it back.
 */
export function documentHost<TDoc extends EngineDocument>(
  kind: DocumentKind,
  id: string,
  savedAt: string,
  toast: (message: string) => void,
  // Extra headers on every request: a CSRF token, an Authorization header.
  headers?: () => Record<string, string>,
) {
  const host = createRestHost<TDoc>({
    baseUrl: `/api/${kind}/${encodeURIComponent(id)}`,
    uploadUrl: '/api/uploads',
    resolveMedia: (key) => `/api/uploads/${key}`,
    savedAt,
    headers,
    toast: (_kind, message) => {
      toast(message);
    },
    // Revisions and sections are in the data model; oEmbed and previews are yours to add.
    paths: { oembed: null, preview: null },
  });
  // No route here imports an image from a link (POST {uploadUrl}/import, which must
  // fetch only public addresses): without the method, the editor hides that option.
  delete host.importImage;
  return host;
}

/**
 * FormView's `onSubmit`, on the form's public page:
 * `<FormView document={form} onSubmit={(s) => submitResponse(slug, s)} />`.
 * `false` keeps the visitor on the form, answers and all.
 */
export async function submitResponse(slug: string, submission: FormSubmission) {
  const response = await fetch(`/api/public/forms/${encodeURIComponent(slug)}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: submission.values,
      locale: document.documentElement.lang || null,
      // The hidden field only bots fill in: the server drops their response.
      trap: submission.trap,
    }),
  });
  return response.ok;
}

/** The form editor's Responses tab, from GET /api/forms/:id/responses. */
export async function loadResponses(formId: string): Promise<FormResponses> {
  const response = await fetch(`/api/forms/${encodeURIComponent(formId)}/responses`);
  if (!response.ok) throw new Error(`The server answered ${String(response.status)}.`);
  const body = (await response.json()) as {
    total: number;
    this_week: number;
    latest: { id: string; title: string; when: string; status: string }[];
  };
  return {
    total: body.total,
    thisWeek: body.this_week,
    latest: body.latest.map((row) => ({
      ...row,
      // The tab shows "when" as words; the server sends the instant.
      when: new Date(row.when).toLocaleString(),
    })),
  };
}
