import type { EmailDocument } from '@builderset/email';
import { createRestHost } from '@builderset/email/host';

/** The editor's host for any of the three example backends: same routes, same answers. */
export function exampleBackendHost(id: number, savedAt: string, toast: (message: string) => void) {
  return createRestHost<EmailDocument>({
    baseUrl: `/api/emails/${String(id)}`,
    uploadUrl: '/api/uploads',
    resolveMedia: (key) => `/api/uploads/${key}`,
    // The record's saved_at, as the page loaded it: the first save sends it back.
    savedAt,
    toast: (_kind, message) => {
      toast(message);
    },
    // These APIs have no versions, saved sections, previews or oEmbed: the editor hides them.
    paths: { revisions: null, sections: null, oembed: null, preview: null },
  });
}
