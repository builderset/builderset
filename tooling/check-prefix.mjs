/**
 * Every Tailwind class in a package's editor and renderer carries the `bst:`
 * prefix (docs/plan/steps/10, part C.3). An unprefixed class is silent:
 * Tailwind emits nothing for it and the element just loses a style, so this is
 * the only thing that reports one. Each package's `unprefixed.node.test.ts`
 * runs it on its own source.
 *
 * Reported: a token in a class position that is a utility without the prefix,
 * and a string elsewhere made only of utilities (a class kept in a constant)
 * with any token unprefixed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  PREFIX,
  isPartial,
  loadUtilityCheck,
  looksLikeClasses,
  relative,
  stringsIn,
  tokensOf,
} from './class-strings.mjs';

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

/** `folders`: the package's folders with classes, e.g. `['src/editor', 'src/render']`. */
export async function unprefixedClasses(packageDir, folders) {
  const isUtility = await loadUtilityCheck();
  const problems = [];
  const files = folders
    .flatMap((f) => walk(join(packageDir, f)))
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const entry of stringsIn(file, text)) {
      const at = () => `${relative(file)}:${text.slice(0, entry.start).split('\n').length}`;
      const missing = tokensOf(entry.text)
        .filter((t) => !isPartial(entry, t) && !t.token.startsWith(PREFIX))
        .filter((t) => isUtility(t.token))
        .map((t) => t.token);
      if (!missing.length) continue;
      if (entry.classPosition) problems.push(`${at()}  ${missing.join(' ')}`);
      else if (looksLikeClasses(entry, isUtility))
        problems.push(`${at()}  ${JSON.stringify(entry.text)}`);
    }
  }
  return problems;
}
