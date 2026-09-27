import { z } from 'zod';

/**
 * A piece of uploaded media, by its storage KEY — never by URL.
 *
 * The host's `upload` adapter returns a key; the renderer asks the host's
 * `resolveMedia` for a URL at render time. Storing the URL would bake one
 * host's bucket address into every document, and the day a CDN goes in front
 * of the bucket every image in every article would point at the old place.
 * Which keys a document may use (which folders) is the SERVER's rule.
 */
export const mediaRefSchema = z.object({
  key: z.string().min(1).max(400),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  mime: z.string().max(100).optional(),
  /** Bytes — shown on a download card. */
  size: z.number().int().nonnegative().optional(),
  /** The original file name — shown on a download card. */
  name: z.string().max(200).optional(),
});

export type MediaRef = z.infer<typeof mediaRefSchema>;

export const MEDIA_KINDS = ['image', 'video', 'audio', 'file'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
