import { customAlphabet } from 'nanoid';

/**
 * Node ids: ten characters from a URL- and CSS-safe alphabet, starting with a
 * letter.
 *
 * Ten is plenty — at a thousand nodes a document has one chance in about a
 * trillion of a collision — and short enough to read in a layers panel or a
 * test failure. Letters first so an id can double as a DOM id or a CSS
 * selector without escaping.
 */
const first = customAlphabet('abcdefghijklmnopqrstuvwxyz', 1);
const rest = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 9);

export type NodeId = string;

export function createId(): NodeId {
  return first() + rest();
}

/** The fixed id every document's root node carries. */
export const ROOT_ID: NodeId = 'root';
