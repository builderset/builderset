/**
 * The hard ceilings of a tree, enforced by the editor AND by the server.
 *
 * They exist so that no document — hand-written, pasted, or posted by a script
 * — can be large enough to make the editor stutter or the renderer slow, and
 * so the server can refuse one before it ever reaches a JSONB column. A kit
 * adds limits on its own content (`ARTICLE_LIMITS`); the API mirrors both and
 * a contract test keeps them in step.
 */
export const LIMITS = {
  /** Nodes in one document, the root included. */
  nodes: 1000,
  /** Nesting depth below the root: section › columns › column › group › … */
  depth: 8,
  /** The serialized document, in bytes (UTF-8). */
  bytes: 200_000,
  /** Characters of text in one rich-text value. */
  richTextChars: 10_000,
  /** Undo steps kept in memory. */
  historySteps: 200,
} as const;

export type Limits = typeof LIMITS;
