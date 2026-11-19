#!/usr/bin/env node
/**
 * Every link from one docs page to another must reach a page, and every
 * `#anchor` on it a heading of that page. Run by `pnpm test` (and CI).
 *
 * Included code files are checked by the build itself: a missing one fails it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'docs');

function pages(folder) {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return pages(path);
    return name.endsWith('.mdx') ? [path] : [];
  });
}

/** content/docs/quick-start/email.mdx → /docs/quick-start/email; index.mdx → its folder. */
function urlOf(file) {
  const route = relative(CONTENT, file)
    .replace(/\\/g, '/')
    .replace(/\.mdx$/, '');
  return `/docs${route === 'index' ? '' : `/${route.replace(/\/index$/, '')}`}`;
}

/** The anchors of a page's headings, as github-slugger (Fumadocs) writes them. */
function anchors(source) {
  const seen = new Map();
  const out = new Set();
  for (const [, text] of source.matchAll(/^#{2,6}\s+(.+)$/gm)) {
    let slug = text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s/g, '-');
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    if (count) slug = `${slug}-${count}`;
    out.add(slug);
  }
  return out;
}

const files = pages(CONTENT);
const byUrl = new Map(files.map((file) => [urlOf(file), readFileSync(file, 'utf8')]));
const problems = [];
for (const file of files) {
  const source = byUrl.get(urlOf(file));
  // Markdown links, and the href of a component such as <Card>.
  const links = [
    ...source.matchAll(/\]\((\/docs[^)\s]*)\)/g),
    ...source.matchAll(/href="(\/docs[^"]*)"/g),
  ];
  for (const [, href] of links) {
    const [path, hash] = href.split('#');
    const target = byUrl.get(path.replace(/\/$/, ''));
    if (target === undefined) problems.push(`${relative(CONTENT, file)}: ${href} — no such page`);
    else if (hash && !anchors(target).has(hash))
      problems.push(`${relative(CONTENT, file)}: ${href} — no heading "#${hash}" there`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`${files.length} pages, every internal link resolves.`);
