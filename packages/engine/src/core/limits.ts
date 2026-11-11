/**
 * The hard ceilings of a document, enforced by the editor AND by the server.
 *
 * They exist so that no document — hand-written, pasted, or posted by a script
 * — can be large enough to make the editor stutter or the renderer slow, and
 * so the server can refuse one before it ever reaches a JSONB column. The API
 * mirrors these numbers; a contract test keeps the two in step.
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
  /** Characters in a short plain-text field — a title, a label, a caption. */
  shortText: 300,
  /** Characters in a long plain-text field — a code block, a description. */
  longText: 20_000,
  /** Items in a list, a FAQ, a timeline, a gallery of steps. */
  listItems: 40,
  tableRows: 60,
  tableColumns: 8,
  galleryImages: 24,
  /** Undo steps kept in memory. */
  historySteps: 200,
} as const;

export type Limits = typeof LIMITS;
