import { readFragmentJson, type ElementRegistry, type Fragment } from '@motors/engine';

import { fragmentFromBlocks, importHTML } from './import-html';
import { importMarkdown, looksLikeMarkdown } from './import-markdown';

/**
 * A fragment from whatever the clipboard holds, or `null` when it holds
 * nothing the builder can use. Nodes of unknown types, or whose props fail
 * their schema, are dropped — a paste from a builder with more plugins must
 * not smuggle in elements this one cannot render.
 */
export function readClipboard(
  data: { json?: string | null; html?: string | null; text?: string | null },
  registry: ElementRegistry,
): Fragment | null {
  if (data.json) {
    const fragment = readFragmentJson(data.json, registry);
    if (fragment?.roots.length) return fragment;
  }
  if (data.html?.trim()) {
    const fragment = importHTML(data.html, registry);
    if (fragment.roots.length) return fragment;
  }
  if (data.text?.trim()) {
    // Plain text is paragraphs split on blank lines — unless it reads as
    // Markdown, in which case its structure is worth keeping.
    const fragment = looksLikeMarkdown(data.text)
      ? importMarkdown(data.text, registry)
      : fragmentFromBlocks(
          data.text
            .split(/\n\s*\n/)
            .map((part) => part.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .map((text) => ({ type: 'paragraph', props: { text: [{ text }] } })),
          registry,
        );
    if (fragment.roots.length) return fragment;
  }
  return null;
}
