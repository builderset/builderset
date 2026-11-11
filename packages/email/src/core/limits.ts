/**
 * How big an email may get. Past these it is too heavy to send well — Gmail
 * clips a message over 102 KB of HTML, and a 600-node email is well past it.
 */
export const EMAIL_LIMITS = {
  nodes: 600,
  columnsPerRow: 4,
  textChars: 20_000,
  links: 100,
  images: 60,
  loopItems: 100,
  /** Serialized JSON of the whole document. */
  bytes: 512_000,
} as const;
