#!/usr/bin/env node
/**
 * Copies the files a project imports as they are — the shadcn bridges — into
 * a package's dist/theme/, so each kit offers them under its own name:
 * `@builderset/email/theme/shadcn.css`. A project installs the kit, not the
 * engine, and a strict package manager would not let it reach the engine's.
 *
 *   node ../../tooling/copy-theme-files.mjs dist/theme
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/engine/src/theme');
const target = resolve(process.argv[2] ?? 'dist/theme');
mkdirSync(target, { recursive: true });
for (const name of ['shadcn.css', 'shadcn-hsl.css'])
  copyFileSync(join(source, name), join(target, name));
