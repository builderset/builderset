import type { EngineDocument, MediaKind } from '@builderset/engine';
import { createRestHost, type UploadResult } from '@builderset/engine/host';
import type { FormSubmission } from '@builderset/form/render';

/** Your Supabase project, as the browser knows it. */
export interface SupabaseProject {
  /** `https://<project>.supabase.co` */
  url: string;
  /** The anon key. It names the project; past that, RLS decides. */
  anonKey: string;
  /**
   * The signed-in user's access token. With supabase-js:
   * `async () => (await supabase.auth.getSession()).data.session?.access_token`
   */
  accessToken: () => Promise<string | undefined>;
  /** The signed-in user's id: their uploads go in their own folder. */
  userId: string;
}

async function authHeaders(project: SupabaseProject): Promise<Record<string, string>> {
  const token = await project.accessToken();
  return { apikey: project.anonKey, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** The media bucket is public: a key's URL never changes and needs no token. */
const publicUrl = (project: SupabaseProject, key: string) =>
  `${project.url}/storage/v1/object/public/media/${key}`;

/** Straight into Storage, which checks the bucket's size and type limits. */
async function upload(
  project: SupabaseProject,
  file: File,
  kind: MediaKind,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<UploadResult> {
  const extension = /\.([a-z0-9]{1,8})$/i.exec(file.name)?.[1]?.toLowerCase() ?? 'bin';
  // The user's own folder, as the storage policy insists, and a name nobody
  // else has: a key never changes, so it is never reused.
  const key = `${project.userId}/${crypto.randomUUID()}.${extension}`;
  const response = await fetch(`${project.url}/storage/v1/object/media/${key}`, {
    method: 'POST',
    headers: {
      ...(await authHeaders(project)),
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
    signal,
  });
  if (!response.ok) {
    const answer = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(answer.message ?? 'The file could not be uploaded.');
  }
  onProgress(1);
  // The editor reserves an image's space before it loads.
  let size = {};
  if (kind === 'image') {
    const bitmap = await createImageBitmap(file);
    size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
  }
  return {
    key,
    url: publicUrl(project, key),
    mime: file.type,
    size: file.size,
    name: file.name,
    ...size,
  };
}

/** The editor's host: the documents Edge Function, with the user's token on every request. */
export function supabaseHost<TDoc extends EngineDocument>(
  project: SupabaseProject,
  kind: 'emails' | 'articles' | 'forms',
  id: string,
  savedAt: string,
  toast: (message: string) => void,
) {
  return createRestHost<TDoc>({
    baseUrl: `${project.url}/functions/v1/documents/${kind}/${id}`,
    headers: () => authHeaders(project),
    // The token travels in a header, not a cookie.
    credentials: 'omit',
    upload: (file, mediaKind, onProgress, signal) =>
      upload(project, file, mediaKind, onProgress, signal),
    resolveMedia: (key) => publicUrl(project, key),
    savedAt,
    toast: (_kind, message) => {
      toast(message);
    },
    // Routes the function does not have: the editor hides those features.
    paths: { revisions: null, sections: null, oembed: null, preview: null },
  });
}

/** FormView's `onSubmit` on the public page: the visitor needs no sign-in, only the anon key. */
export async function submitResponse(
  project: SupabaseProject,
  slug: string,
  submission: FormSubmission,
) {
  const response = await fetch(
    `${project.url}/functions/v1/form-responses/${encodeURIComponent(slug)}`,
    {
      method: 'POST',
      headers: {
        apikey: project.anonKey,
        Authorization: `Bearer ${project.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answers: submission.values,
        locale: document.documentElement.lang || null,
        trap: submission.trap,
      }),
    },
  );
  // false keeps the visitor on the form, answers and all.
  return response.ok;
}
