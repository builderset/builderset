#!/usr/bin/env node
/**
 * Finishes a stylesheet Tailwind built, and checks it
 * (docs/plan/steps/10_STYLES_AND_THEMING.md, part D):
 *
 *   node ../../tooling/finish-css.mjs dist/styles.css [dist/content.css …]
 *
 * Removes Tailwind's `@layer properties` fallback. It exists for browsers
 * without `@property`, which are older than the `light-dark()` the theme
 * already needs, and it sets Tailwind's variables on every element of the page
 * (`*, ::before, ::after`), outside the editor.
 *
 * Gives the utilities that are written entirely inside `:where()` — `space-y-*`
 * and `divide-*`: `:where(.bst\:space-y-4>:not(:last-child))` — the editor's
 * scope in front. With no specificity of their own they lost to the scoped
 * reset (`.builderset :where(*) { margin: 0 }`); in Tailwind's layered build
 * they win by layer, and here they win by coming later at the same weight.
 *
 * Moves Tailwind's theme variables from `:root, :host` to `.builderset`, so
 * the page's own elements do not inherit them. Tailwind's `@property`
 * registrations of `--tw-*` stay global: CSS has no way to scope them.
 *
 * Then fails on what must never ship:
 * - any `@layer`: a page's own layers, or its unlayered rules, would reorder it;
 * - a class that is not the product's: `.builderset…`, `.bst\:…`, `.bld-…`, the
 *   form's own stylesheet (`.bsf…`, every modifier included),
 *   the rich-text editor's own `.ProseMirror` and `.is-editor-empty`, and the
 *   page's `.dark` and `.light` markers, which `theme="auto"` reads;
 * - a Tailwind theme variable without the prefix (`--color-…`, `--spacing`).
 *   Tailwind's per-element `--tw-*` variables carry no prefix in v4; they are
 *   set by each utility on its own element and do not inherit.
 */
import { readFileSync, writeFileSync } from 'node:fs';

// `.dark` and `.light` are the page's own markers on an ancestor, which
// `theme="auto"` follows (scheme.css): read, never set.
const ALLOWED_CLASSES =
  /^(builderset(-content)?|bst|bld-[\w-]+|bsf(-[\w-]+)?|ProseMirror|is-editor-empty|dark|light)$/;
const THEME_NAMESPACES =
  /^--(color|spacing|text|font|font-weight|radius|shadow|inset-shadow|drop-shadow|ease|animate|container|breakpoint|tracking|leading|blur|perspective|aspect|default)(-|$)/;

/** Remove every `@layer properties { … }` block and `@layer properties;`. */
function stripPropertiesLayer(css) {
  let out = css.replace(/@layer properties\s*;/g, '');
  for (
    let at = out.indexOf('@layer properties');
    at !== -1;
    at = out.indexOf('@layer properties')
  ) {
    const open = out.indexOf('{', at);
    let depth = 1;
    let i = open + 1;
    for (; depth > 0 && i < out.length; i++) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}') depth--;
    }
    out = out.slice(0, at) + out.slice(i);
  }
  return out;
}

/** The selectors of every rule, without declaration blocks or at-rule preludes. */
function selectors(css) {
  const found = [];
  const noStrings = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"[^"]*"|'[^']*'/g, '""');
  for (const m of noStrings.matchAll(/(^|[{};])\s*([^{};@][^{};]*)\{/g)) found.push(m[2]);
  return found;
}

let failed = false;
for (const file of process.argv.slice(2)) {
  const css = stripPropertiesLayer(readFileSync(file, 'utf8'))
    .replace(/(^|[{},])(\s*):where\(\.bst\\:/g, '$1$2.builderset :where(.bst\\:')
    // Tailwind declares its theme variables (--bst-spacing, --bst-text-sm…)
    // on :root, where every element of the page inherits them. Only the
    // editor uses them, so they are declared on the editor's root instead.
    .replace(/:root,\s*:host\s*\{/g, '.builderset{');
  writeFileSync(file, css);
  const problems = [];
  if (css.includes('@layer')) problems.push('contains @layer');
  const classes = new Set();
  for (const selector of selectors(css))
    for (const m of selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes.add(m[1]);
  const foreign = [...classes].filter((c) => !ALLOWED_CLASSES.test(c));
  if (foreign.length)
    problems.push(`classes that are not the product's: ${foreign.slice(0, 12).join(' ')}`);
  const variables = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const unprefixed = [...variables].filter((v) => THEME_NAMESPACES.test(v));
  if (unprefixed.length)
    problems.push(`unprefixed theme variables: ${unprefixed.slice(0, 12).join(' ')}`);
  const kb = (Buffer.byteLength(css) / 1024).toFixed(1);
  if (problems.length) {
    failed = true;
    console.error(`✗ ${file} (${kb} KB)`);
    for (const p of problems) console.error(`  ${p}`);
  } else console.log(`✓ ${file} (${kb} KB)`);
}
process.exit(failed ? 1 : 0);
