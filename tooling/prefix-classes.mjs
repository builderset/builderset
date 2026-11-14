#!/usr/bin/env node
/**
 * Step 10, part C.1: puts `bst:` in front of every Tailwind class. Run once.
 *
 *   node tooling/prefix-classes.mjs                  dry run: what would change
 *   node tooling/prefix-classes.mjs --write          rewrite the class positions
 *   node tooling/prefix-classes.mjs --write --candidates approved.txt
 *                                                    and the candidates listed
 *
 * `approved.txt` holds one `path:line` per line, from the candidate list this
 * prints. Only src/editor and src/render are read; a core path is refused.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PREFIX,
  ROOT,
  isPartial,
  loadUtilityCheck,
  looksLikeClasses,
  refuseCore,
  relative,
  stringsIn,
  tokensOf,
} from './class-strings.mjs';

const args = process.argv.slice(2);
const write = args.includes('--write');
const approvedFile = args.includes('--candidates') ? args[args.indexOf('--candidates') + 1] : null;
const approved = new Set(
  approvedFile
    ? readFileSync(approvedFile, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => l.split(/\s/)[0])
    : [],
);

const walk = (dir) => {
  try {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  } catch {
    return [];
  }
};
export const sourceFiles = () =>
  ['engine', 'article', 'email']
    .flatMap((pkg) =>
      ['editor', 'render'].flatMap((f) => walk(join(ROOT, 'packages', pkg, 'src', f))),
    )
    .filter((f) => /\.tsx?$/.test(f));

const isUtility = await loadUtilityCheck();
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

let changedStrings = 0;
let changedFiles = 0;
const candidates = [];
const partials = [];
for (const file of sourceFiles()) {
  refuseCore(file);
  const text = readFileSync(file, 'utf8');
  const edits = [];
  for (const entry of stringsIn(file, text)) {
    const where = `${relative(file)}:${lineOf(text, entry.start)}`;
    const inClass = entry.classPosition || approved.has(where);
    if (!inClass) {
      if (looksLikeClasses(entry, isUtility))
        candidates.push(`${where}  ${JSON.stringify(entry.text)}`);
      continue;
    }
    let next = entry.text;
    for (const t of tokensOf(entry.text).reverse()) {
      if (t.token.startsWith(PREFIX)) continue;
      if (isPartial(entry, t)) {
        if (/[a-z]/.test(t.token)) partials.push(`${where}  ${JSON.stringify(t.token)}`);
        continue;
      }
      if (!isUtility(t.token)) continue;
      next = next.slice(0, t.at) + PREFIX + next.slice(t.at);
    }
    if (next !== entry.text) edits.push({ start: entry.start, end: entry.end, text: next });
  }
  if (!edits.length) continue;
  changedFiles += 1;
  changedStrings += edits.length;
  if (!write) continue;
  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  writeFileSync(file, out);
}

console.log(
  `${write ? 'Rewrote' : 'Would rewrite'} ${changedStrings} strings in ${changedFiles} files.`,
);
if (candidates.length) {
  console.log(
    `\nCandidates — strings outside a class position made only of utilities (${candidates.length}):`,
  );
  for (const c of candidates) console.log(`  ${c}`);
}
if (partials.length) {
  console.log(`\nPieces next to a \${…} — not judged (${partials.length}):`);
  for (const p of partials) console.log(`  ${p}`);
}
