#!/usr/bin/env node
/**
 * One version for the whole product: writes the npm packages' version into the
 * Python package (`python/src/builderset/__init__.py`).
 *
 *   node tooling/sync-python-version.mjs           write it
 *   node tooling/sync-python-version.mjs --check   fail when they differ (CI)
 *
 * npm and PyPI spell a pre-release differently: npm's `0.1.0-alpha.3` is
 * PyPI's `0.1.0a3` (PEP 440), and a snapshot's `0.1.0-alpha.20261115093000`
 * is `0.1.0a20261115093000`. `toPython` is exported for the tests and for
 * projects that compare the two.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INIT = join(root, 'python', 'src', 'builderset', '__init__.py');
const LINE = /^__version__ = "([^"]*)"$/m;

const PRE = { alpha: 'a', beta: 'b', rc: 'rc' };

/** `0.1.0` → `0.1.0`, `0.1.0-alpha.3` → `0.1.0a3`, `1.2.0-rc.1` → `1.2.0rc1`. */
export function toPython(version) {
  const match = /^(\d+\.\d+\.\d+)(?:-(alpha|beta|rc)\.(\d+))?$/.exec(version);
  if (!match) throw new Error(`${version}: not a version this script can convert`);
  const [, release, tag, number] = match;
  return tag ? `${release}${PRE[tag]}${number}` : release;
}

function main() {
  const { version } = JSON.parse(readFileSync(join(root, 'packages/engine/package.json'), 'utf8'));
  const wanted = toPython(version);
  const source = readFileSync(INIT, 'utf8');
  const current = LINE.exec(source)?.[1];
  if (current === undefined) throw new Error(`${INIT}: no __version__ line`);

  if (process.argv.includes('--check')) {
    if (current !== wanted) {
      console.error(
        `The Python package is ${current}, the npm packages ${version} (${wanted} in Python).\n` +
          'Run: node tooling/sync-python-version.mjs',
      );
      process.exit(1);
    }
    console.log(`Python ${current} = npm ${version}`);
    return;
  }
  if (current !== wanted) {
    writeFileSync(INIT, source.replace(LINE, `__version__ = "${wanted}"`));
    console.log(`Python ${current} → ${wanted}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
