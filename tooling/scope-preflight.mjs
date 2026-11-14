#!/usr/bin/env node
/**
 * Writes packages/engine/src/theme/reset.css: Tailwind's preflight, scoped to
 * the editor (docs/plan/steps/10_STYLES_AND_THEMING.md, part B).
 *
 *   node tooling/scope-preflight.mjs        after upgrading Tailwind
 *
 * Every selector X becomes `.builderset :where(X)` — the specificity of one
 * class, which beats a page's `button { … }` and ties with a `bst:` utility
 * that comes later in the file and therefore wins. A pseudo-element cannot sit
 * inside `:where()`, so `X::placeholder` becomes `.builderset :where(X)::placeholder`.
 * `html` and `:host` are the editor's own root.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'package.json'));
const preflightPath = require.resolve('tailwindcss/preflight.css');
const version = require('tailwindcss/package.json').version;
const SCOPES = ['.builderset'];

/** Split on commas that are not inside parentheses. */
const splitList = (text) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
};

const scopeOne = (selector, scope) => {
  if (selector === 'html' || selector === ':host') return scope;
  const at = selector.indexOf('::');
  if (at === -1) return `${scope} :where(${selector})`;
  const base = selector.slice(0, at);
  const pseudo = selector.slice(at);
  return base ? `${scope} :where(${base})${pseudo}` : `${scope} ${pseudo}`;
};
const scopeList = (list) =>
  splitList(list)
    .flatMap((s) => SCOPES.map((scope) => scopeOne(s, scope)))
    .filter((s, i, all) => all.indexOf(s) === i)
    .join(',\n');

/** Rewrite the selectors of every rule; recurse into @supports and @media. */
function rewrite(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) {
      out += css.slice(i);
      break;
    }
    // The prelude runs from the end of the last block (or a comment) to `{`.
    // Only LEADING comments are split off: an @supports condition has its own.
    let rest = css.slice(i, open);
    let head = '';
    for (let m = rest.match(/^\s*\/\*[\s\S]*?\*\//); m; m = rest.match(/^\s*\/\*[\s\S]*?\*\//)) {
      head += m[0];
      rest = rest.slice(m[0].length);
    }
    const selector = rest.trim();
    let depth = 1;
    let j = open + 1;
    while (depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);
    out += head + '\n';
    if (selector.startsWith('@')) out += `${selector} {${rewrite(body)}}\n`;
    else out += `${scopeList(selector)} {${body}}\n`;
    i = j;
  }
  return out;
}

const source = readFileSync(preflightPath, 'utf8');
const header = `/*
 * Tailwind ${version}'s preflight, scoped to \`.builderset\`: the editor, and a
 * rendered article. Written by tooling/scope-preflight.mjs — do not edit by hand.
 *
 * \`.builderset :where(button)\` has the specificity of one class: it beats a
 * page's own \`button { … }\`, and a \`bst:\` utility, later in the file, beats it.
 */
`;
const target = join(ROOT, 'packages/engine/src/theme/reset.css');
writeFileSync(target, header + rewrite(source).replace(/\n{3,}/g, '\n\n'));
console.log(`wrote ${target.slice(ROOT.length + 1)} from tailwindcss ${version}`);
