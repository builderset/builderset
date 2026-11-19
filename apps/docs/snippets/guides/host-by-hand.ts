import type { EmailDocument } from '@builderset/email';
import type { BuilderHost } from '@builderset/email/host';

/**
 * A host written by hand, for an API that does not have createRestHost's
 * shape: the four required methods. Every optional one left out hides its
 * feature in the editor.
 */
export function createHost(
  id: string,
  initialSavedAt: string | null,
  notify: (kind: 'success' | 'error' | 'info', message: string) => void,
): BuilderHost<EmailDocument> {
  let lastSavedAt = initialSavedAt;

  return {
    async save(document, reason, options) {
      try {
        const response = await fetch(`/api/emails/${id}/draft`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document,
            reason,
            // "Keep mine" after a conflict: the editor saves again with force.
            expected_saved_at: options?.force ? null : lastSavedAt,
          }),
        });
        if (response.status === 409) {
          return { ok: false, conflict: true, message: 'Changed by someone else.' };
        }
        if (!response.ok) return { ok: false, message: 'Could not save.' };
        const answer = (await response.json()) as { saved_at: string };
        lastSavedAt = answer.saved_at;
        return { ok: true, savedAt: answer.saved_at };
      } catch {
        // Never throw into the editor: it shows the message and retries.
        return { ok: false, message: 'You are offline.' };
      }
    },

    async upload(file, kind, onProgress, signal) {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      const response = await fetch('/api/uploads', { method: 'POST', body, signal });
      if (!response.ok) throw new Error('Upload failed.');
      onProgress(1);
      return (await response.json()) as { key: string; url: string };
    },

    // Not async: the canvas calls it for every picture it draws.
    resolveMedia: (key) => `https://cdn.example.com/${key}`,

    toast: (kind, message) => {
      notify(kind, message);
    },
  };
}
