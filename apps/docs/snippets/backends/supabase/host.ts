import type { EngineDocument } from '@builderset/engine';
import { createRestHost } from '@builderset/engine/host';
import type { FormResponses } from '@builderset/form/editor';
import type { FormSubmission } from '@builderset/form/render';
import type { PopupEvent } from '@builderset/popup/render';

/** Your Supabase project, as the browser knows it. */
export interface SupabaseProject {
  /** `https://<project>.supabase.co` */
  url: string;
  /** The anon key. It names the project; past that, RLS decides. */
  anonKey: string;
  /**
   * The signed-in user's access token, if any. With supabase-js:
   * `async () => (await supabase.auth.getSession()).data.session?.access_token`
   */
  accessToken: () => Promise<string | undefined>;
}

/** The five builders' routes differ only in this segment. */
export type DocumentKind = 'emails' | 'articles' | 'forms' | 'cards' | 'popups';

/** The user's token when signed in; the anon key, which is no user, when not. */
async function authHeaders(project: SupabaseProject): Promise<Record<string, string>> {
  const token = (await project.accessToken()) ?? project.anonKey;
  return { apikey: project.anonKey, Authorization: `Bearer ${token}` };
}

const functionUrl = (project: SupabaseProject, path: string) =>
  `${project.url}/functions/v1/${path}`;

/** The media bucket is public: a key's URL never changes and needs no token. */
const publicUrl = (project: SupabaseProject, key: string) =>
  `${project.url}/storage/v1/object/public/media/${key}`;

/**
 * The editor's host: the documents function, with the user's token on every
 * request. `id` is the row's uuid; `savedAt` is the row's, as the page loaded
 * it: the first save sends it back.
 */
export function supabaseHost<TDoc extends EngineDocument>(
  project: SupabaseProject,
  kind: DocumentKind,
  id: string,
  savedAt: string,
  toast: (message: string) => void,
) {
  const host = createRestHost<TDoc>({
    baseUrl: functionUrl(project, `documents/${kind}/${encodeURIComponent(id)}`),
    uploadUrl: functionUrl(project, 'documents/uploads'),
    headers: () => authHeaders(project),
    // The token travels in a header, not a cookie.
    credentials: 'omit',
    resolveMedia: (key) => publicUrl(project, key),
    savedAt,
    toast: (_kind, message) => {
      toast(message);
    },
    // Revisions and sections are the function's; oEmbed and previews are yours to add.
    paths: { oembed: null, preview: null },
  });
  // No route here imports an image from a link (POST {uploadUrl}/import, which must
  // fetch only public addresses): without the method, the editor hides that option.
  delete host.importImage;
  return host;
}

/** FormView's `onSubmit` on the public page. A signed-in visitor is named on the response. */
export async function submitResponse(
  project: SupabaseProject,
  slug: string,
  submission: FormSubmission,
) {
  const response = await fetch(functionUrl(project, `form-responses/${encodeURIComponent(slug)}`), {
    method: 'POST',
    headers: { ...(await authHeaders(project)), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers: submission.values,
      locale: document.documentElement.lang || null,
      trap: submission.trap,
    }),
  });
  // false keeps the visitor on the form, answers and all.
  return response.ok;
}

/** The form editor's Responses tab. */
export async function loadResponses(
  project: SupabaseProject,
  formId: string,
): Promise<FormResponses> {
  const response = await fetch(
    functionUrl(project, `documents/forms/${encodeURIComponent(formId)}/responses`),
    { headers: await authHeaders(project) },
  );
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

/**
 * PopupView's `onEvent` and `onSubmit`, on your site:
 * `<PopupView document={popup.document} {...popupHandlers(project, popup.id)} />`.
 * An event goes straight to record_popup_event through the REST API; a
 * submission to the popups function, which checks it again.
 */
export function popupHandlers(project: SupabaseProject, popupId: string) {
  return {
    onEvent(event: PopupEvent) {
      // keepalive: the count still arrives when the visitor leaves the page.
      void fetch(`${project.url}/rest/v1/rpc/record_popup_event`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: project.anonKey,
          Authorization: `Bearer ${project.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_popup: popupId, p_event: event }),
      });
    },
    async onSubmit(values: Record<string, string>) {
      const response = await fetch(
        functionUrl(project, `popups/${encodeURIComponent(popupId)}/submissions`),
        {
          method: 'POST',
          headers: { ...(await authHeaders(project)), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            values,
            path: location.pathname,
            locale: document.documentElement.lang || null,
          }),
        },
      );
      // false keeps the visitor on the popup, answers and all.
      return response.ok;
    },
  };
}
