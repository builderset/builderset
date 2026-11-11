/**
 * Which URLs a document may carry.
 *
 * A link in an article is a place a reader is sent, and a place the renderer
 * writes into an `href`. `javascript:` and `data:` would turn a link into code,
 * so the rule is an allow-list, not a block-list: web addresses, mail, phone,
 * a path on the same site, and an anchor on the same page. Anything else is
 * refused on the way in by the editor AND by the server.
 */

const SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'] as const;

export function isSafeUrl(value: string): boolean {
  const url = value.trim();
  if (url === '' || url.length > 2000) return false;
  // Whitespace or control characters inside a URL are how `java\tscript:`
  // sneaks past a naive scheme check; nothing legitimate needs them.
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f]/.test(url)) return false;

  // Same page, same site. `//host` is protocol-relative, i.e. another site
  // pretending to be a path, so it is not a path.
  if (url.startsWith('#')) return /^#[A-Za-z][\w-]*$/.test(url);
  if (url.startsWith('/')) return !url.startsWith('//');

  try {
    const parsed = new URL(url);
    return (SCHEMES as readonly string[]).includes(parsed.protocol);
  } catch {
    return false;
  }
}

/** True for a link that leaves the site — it gets `rel="noopener noreferrer"`. */
export function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/**
 * An anchor id as a heading or a section may carry it: a letter first, then
 * letters, digits, `-` and `_`. The same rule HTML ids and `#fragment` links
 * are safe under without escaping.
 */
export function isAnchor(value: string): boolean {
  return /^[A-Za-z][\w-]{0,79}$/.test(value);
}

/** A readable anchor from text: "Why buy used?" → "why-buy-used". */
export function slugifyAnchor(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  if (!slug) return 'section';
  return /^[a-z]/.test(slug) ? slug : `s-${slug}`;
}
