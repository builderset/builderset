/**
 * The embed allow-list.
 *
 * An embed is somebody else's page inside ours, so the list of somebody-elses
 * is short and explicit: a provider is recognised from the URL the writer
 * pastes, and anything not on the list is refused — by the editor, and again by
 * the server, which resolves the playable URL itself rather than trusting one
 * from the document. What reaches the page is always an `<iframe>` pointed at
 * the provider's own embed endpoint, sandboxed, and loaded only when the reader
 * asks (click-to-load), so a reader who never presses play never talks to the
 * provider at all.
 */

export const EMBED_PROVIDERS = [
  'youtube',
  'vimeo',
  'x',
  'instagram',
  'tiktok',
  'spotify',
  'google-maps',
] as const;

export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];

const PATTERNS: Record<EmbedProvider, RegExp[]> = {
  youtube: [
    /^https:\/\/(www\.|m\.)?youtube\.com\/(watch\?v=|shorts\/|embed\/)[\w-]{6,}/i,
    /^https:\/\/youtu\.be\/[\w-]{6,}/i,
  ],
  vimeo: [/^https:\/\/(www\.|player\.)?vimeo\.com\/(video\/)?\d+/i],
  x: [/^https:\/\/(www\.)?(twitter|x)\.com\/\w{1,15}\/status\/\d+/i],
  instagram: [/^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i],
  tiktok: [/^https:\/\/(www\.)?tiktok\.com\/@[\w.]+\/video\/\d+/i],
  spotify: [/^https:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\/[A-Za-z0-9]+/i],
  'google-maps': [
    /^https:\/\/(www\.)?google\.[a-z.]+\/maps\//i,
    /^https:\/\/maps\.app\.goo\.gl\/\w+/i,
  ],
};

/** The provider a pasted URL belongs to, or `null` when it is not allowed. */
export function detectEmbedProvider(url: string): EmbedProvider | null {
  const value = url.trim();
  for (const provider of EMBED_PROVIDERS) {
    if (PATTERNS[provider].some((pattern) => pattern.test(value))) return provider;
  }
  return null;
}

/** The provider's natural shape, for the placeholder before it loads. */
export const EMBED_ASPECT: Record<EmbedProvider, number> = {
  youtube: 16 / 9,
  vimeo: 16 / 9,
  x: 3 / 4,
  instagram: 4 / 5,
  tiktok: 9 / 16,
  spotify: 5 / 2,
  'google-maps': 4 / 3,
};
