import type { EmailDocument } from '@builderset/email';
import { createRestHost } from '@builderset/email/host';

/**
 * The editor's host for any of the three example backends: same routes, same
 * answers. `id` is the template's uuid; `savedAt` is its saved_at, as the page
 * loaded it: the first save sends it back.
 */
export function exampleBackendHost(
  id: string,
  savedAt: string,
  toast: (message: string) => void,
  // Your auth's headers on every request. The examples' stand-in reads X-User-Id.
  headers?: () => Record<string, string>,
) {
  return createRestHost<EmailDocument>({
    baseUrl: `/api/emails/${encodeURIComponent(id)}`,
    uploadUrl: '/api/uploads',
    resolveMedia: (key) => `/api/uploads/${key}`,
    savedAt,
    headers,
    toast: (_kind, message) => {
      toast(message);
    },
    // Revisions are there; saved sections, previews and oEmbed are not: the editor hides them.
    paths: { sections: null, oembed: null, preview: null },
  });
}
