#!/usr/bin/env node
/**
 * Checks what no general tool knows about the built packages
 * (docs/plan/steps/09_BUILD_AND_PACKAGE_SHAPE.md, part 5c). Run after
 * `pnpm build`:
 *
 *   node tooling/check-dist.mjs [packages/<name> ...]   (default: every package)
 *
 * No dependencies. Exits 1 and lists every problem it finds.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_FOLDERS = ['core', 'host']; // no React, no 'use client'
const REACT = /^(react|react-dom)(\/|$)/;

const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
      })
    : [];
const read = (file) => readFileSync(file, 'utf8');
const unix = (path) => path.split(sep).join('/');

/** The first statement: what follows any leading comments and blank lines. */
const firstStatement = (text) =>
  text
    .replace(/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, '')
    .split(/[;\n]/, 1)[0]
    .trim();
const isClient = (text) => /^['"]use client['"]$/.test(firstStatement(text));

/** Every module specifier a built file names: imports, re-exports, import(). */
const specifiers = (text) =>
  [
    ...text.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]/gm),
    ...text.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm),
    ...text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1]);

const packageName = (specifier) =>
  specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];

function checkPackage(dir) {
  const problems = [];
  const fail = (file, message) => problems.push(`${unix(relative(ROOT, file))}: ${message}`);
  const manifest = JSON.parse(read(join(dir, 'package.json')));
  const src = join(dir, 'src');
  const dist = join(dir, 'dist');
  if (!existsSync(dist)) return [`${unix(relative(ROOT, dir))}: no dist/ — run pnpm build`];

  const declared = new Set([
    manifest.name,
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  const rootPaths = [ROOT, unix(ROOT), ROOT.replaceAll('\\', '\\\\')];

  // 1. Every 'use client' source file has a built file that starts with it.
  for (const file of walk(src)) {
    if (!/\.tsx?$/.test(file) || /\.test\.tsx?$|test-setup\.ts$/.test(file)) continue;
    if (!isClient(read(file))) continue;
    const built = join(dist, relative(src, file)).replace(/\.tsx?$/, '.js');
    if (!existsSync(built))
      fail(file, `starts with 'use client' but was not built (${unix(relative(dir, built))})`);
    else if (!isClient(read(built))) fail(built, `lost its 'use client' line`);
  }

  for (const file of walk(dist)) {
    const text = read(file);
    const path = unix(relative(dist, file));
    const folder = path.includes('/') ? path.split('/')[0] : path.replace(/\.(d\.ts|js)$/, '');
    const isJs = file.endsWith('.js');
    const isDts = file.endsWith('.d.ts');

    // 2. Leftovers: the old scope, a source path, the build machine's path.
    if (file.endsWith('.map')) {
      const map = JSON.parse(text);
      if (
        !Array.isArray(map.sourcesContent) ||
        map.sourcesContent.length !== map.sources.length ||
        map.sourcesContent.some((s) => s == null)
      )
        fail(file, 'source map without sourcesContent: it points at src/, which is not shipped');
    } else {
      if (text.includes('@motors/')) fail(file, 'names @motors/');
      if (/['"`(]\.{0,2}\/?[\w./-]*\/src\//.test(text)) fail(file, 'names a path in src/');
    }
    if (rootPaths.some((p) => text.includes(p))) fail(file, "contains the build machine's path");
    if (!isJs && !isDts) continue;

    // 3. The server doors render nothing.
    if (SERVER_FOLDERS.includes(folder) && isJs && isClient(text))
      fail(file, `'use client' in ${folder}/`);
    // 4. A renderer is never a client component as a whole.
    if (path === 'render/index.js' && isClient(text))
      fail(file, "the renderer starts with 'use client'");

    for (const specifier of specifiers(text)) {
      if (specifier.startsWith('.')) {
        // 5. Relative imports name the file, and the file exists.
        if (!specifier.endsWith('.js') && !specifier.endsWith('.json')) {
          fail(file, `relative import without .js: '${specifier}'`);
          continue;
        }
        const target = posix.normalize(posix.join(posix.dirname(path), specifier));
        const onDisk = join(dist, isDts ? target.replace(/\.js$/, '.d.ts') : target);
        if (!existsSync(onDisk)) fail(file, `imports a file that does not exist: '${specifier}'`);
        const targetFolder = target.split('/')[0];
        if (['core', 'host', 'render'].includes(folder) && targetFolder === 'editor')
          fail(file, `${folder}/ imports the editor: '${specifier}'`);
        if (SERVER_FOLDERS.includes(folder) && targetFolder === 'render')
          fail(file, `${folder}/ imports the renderer: '${specifier}'`);
        continue;
      }
      if (specifier.startsWith('node:')) continue;
      // 6. React stays out of the server doors, and out of the email renderer.
      if (REACT.test(specifier) && isJs) {
        if (SERVER_FOLDERS.includes(folder)) fail(file, `${folder}/ imports ${specifier}`);
        if (manifest.name === '@builderset/email' && folder === 'render')
          fail(file, `the email renderer imports ${specifier}: it writes strings`);
      }
      // 7. Every package the output imports is declared.
      if (!declared.has(packageName(specifier)))
        fail(file, `imports '${specifier}', which is not in dependencies or peerDependencies`);
    }
  }

  // 8. Every door leads somewhere; a wildcard door leads to at least one file.
  for (const [door, target] of Object.entries(manifest.exports ?? {})) {
    const targets = typeof target === 'string' ? [target] : Object.values(target);
    for (const t of targets) {
      if (!t.includes('*')) {
        if (!existsSync(join(dir, t)))
          fail(join(dir, 'package.json'), `"${door}" → ${t} does not exist`);
        continue;
      }
      const [before, after] = t.split('*');
      const cut = before.lastIndexOf('/') + 1;
      const folder = join(dir, before.slice(0, cut));
      const prefix = before.slice(cut);
      const matches = existsSync(folder)
        ? readdirSync(folder).filter((n) => n.startsWith(prefix) && n.endsWith(after))
        : [];
      if (!matches.length) fail(join(dir, 'package.json'), `"${door}" → ${t} matches no file`);
    }
  }
  return problems;
}

const dirs = process.argv.slice(2).length
  ? process.argv.slice(2).map((d) => resolve(d))
  : readdirSync(join(ROOT, 'packages'))
      .map((name) => join(ROOT, 'packages', name))
      .filter((d) => existsSync(join(d, 'package.json')));

let total = 0;
for (const dir of dirs) {
  const name = JSON.parse(read(join(dir, 'package.json'))).name;
  const problems = checkPackage(dir);
  total += problems.length;
  console.log(problems.length ? `✗ ${name}` : `✓ ${name}`);
  for (const problem of problems) console.log(`  ${problem}`);
}
process.exit(total ? 1 : 0);
