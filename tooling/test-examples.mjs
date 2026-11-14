#!/usr/bin/env node
/**
 * The examples, installed the way a stranger installs them
 * (docs/plan/steps/12_EXAMPLES_AND_TEST_MATRIX.md, part 2):
 *
 *   pnpm test:examples                         every example
 *   pnpm test:examples --example node-render   one of them (repeatable)
 *   pnpm test:examples -- --project=chromium   arguments for Playwright
 *   pnpm test:examples --keep                  keep the temporary folder
 *   pnpm test:examples --from alpha            the packages already published
 *                                              under that tag (docs/plan/steps/13)
 *
 * 1. Builds the packages.
 * 2. Starts a local registry (Verdaccio) with empty storage, on a free port.
 * 3. Packs every package (pnpm writes the real versions for workspace:*) and
 *    publishes it there. The `private` flag is cleared in the packed copy only.
 * 4. Copies each example to a folder OUTSIDE the repository — inside it, a
 *    package manager would find the workspace and link folders again — points
 *    its dependencies at the published versions and installs it with npm.
 * 5. Builds the example and runs its tests.
 *
 * With `--from <tag>`, steps 1–3 are replaced by asking each package's own
 * registry (its `publishConfig.registry`) which version the tag names. Reading
 * from GitHub Packages needs a token in the user's .npmrc. An example that
 * needs a package that is never published (`private`) is skipped, by name.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dash = argv.indexOf('--');
const ours = dash === -1 ? argv : argv.slice(0, dash);
const playwrightArgs = dash === -1 ? [] : argv.slice(dash + 1);
const only = ours.flatMap((a, i) => (a === '--example' ? [ours[i + 1]] : []));
const keep = ours.includes('--keep');
const from = ours.includes('--from') ? ours[ours.indexOf('--from') + 1] : null;
if (ours.includes('--from') && !from) throw new Error('--from needs a tag: --from alpha');

/** Each example: what proves it works, once installed. */
const EXAMPLES = {
  'node-render': [['npm', 'test']],
  'vite-react': [
    ['npm', 'run', 'build'],
    ['npx', 'playwright', 'test', ...playwrightArgs],
  ],
  'next-shadcn': [
    ['npm', 'run', 'build'],
    ['npx', 'playwright', 'test', ...playwrightArgs],
  ],
};
const SKIP = new Set([
  'node_modules',
  'dist',
  '.next',
  '.data',
  '.turbo',
  'test-results',
  'playwright-report',
]);

const log = (message) => console.log(`\n▶ ${message}`);
/** On Windows npm, npx and pnpm are .cmd files and need a shell: one quoted command line. */
const quote = (arg) => (/^[\w@./:=\\-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`);
function run(command, args, options = {}) {
  console.log(`  $ ${[command, ...args].join(' ')}${options.cwd ? `   (in ${options.cwd})` : ''}`);
  const result =
    process.platform === 'win32'
      ? spawnSync([command, ...args].map(quote).join(' '), {
          stdio: 'inherit',
          shell: true,
          ...options,
        })
      : spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
}
/** A command's output, or null when it fails. */
function read(command, args) {
  const result =
    process.platform === 'win32'
      ? spawnSync([command, ...args].map(quote).join(' '), { shell: true, encoding: 'utf8' })
      : spawnSync(command, args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}
/** The repository's packages: name → manifest. */
const PACKAGES = Object.fromEntries(
  readdirSync(join(ROOT, 'packages'))
    .map((name) => join(ROOT, 'packages', name, 'package.json'))
    .filter((path) => existsSync(path))
    .map((path) => JSON.parse(readFileSync(path, 'utf8')))
    .map((manifest) => [manifest.name, manifest]),
);
/**
 * Unpacks a .tgz into a folder, in Node: no `tar` on the PATH to depend on
 * (Git Bash's reads `C:` in a path as a host name). Regular files and folders,
 * the ustar prefix and pax path records — what a package manager writes.
 */
function untar(tgz, into) {
  const data = gunzipSync(readFileSync(tgz));
  const field = (block, start, length) =>
    block
      .subarray(start, start + length)
      .toString('utf8')
      .replace(/\0.*$/s, '');
  let pending = null;
  for (let at = 0; at + 512 <= data.length;) {
    const header = data.subarray(at, at + 512);
    if (header.every((byte) => byte === 0)) break;
    const size = parseInt(field(header, 124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156] || 48);
    const body = data.subarray(at + 512, at + 512 + size);
    const prefix = field(header, 345, 155);
    let name = pending ?? (prefix ? `${prefix}/${field(header, 0, 100)}` : field(header, 0, 100));
    pending = null;
    if (type === 'x') {
      const path = /\d+ path=([^\n]*)\n/.exec(body.toString('utf8'));
      pending = path?.[1] ?? null;
    } else if (type === '0' || type === '\0') {
      const target = join(into, name);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body);
    } else if (type === '5') mkdirSync(join(into, name), { recursive: true });
    at += 512 + Math.ceil(size / 512) * 512;
    name = '';
  }
}

const freePort = () =>
  new Promise((done) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => done(port));
    });
  });

const work = mkdtempSync(join(tmpdir(), 'builderset-examples-'));
let registry;
let failed = false;
/** The version each package is installed at. */
const versions = {};
/** Packages that are never published: name → why. */
const unpublished = {};
let env = process.env;
/** The .npmrc each example is installed with. */
let exampleNpmrc = '';
try {
  if (from) {
    log(`Asking each package's registry for its "${from}" version`);
    const scopes = new Set();
    for (const [name, manifest] of Object.entries(PACKAGES)) {
      if (manifest.private) {
        unpublished[name] = 'private, never published';
        continue;
      }
      const registry = manifest.publishConfig?.registry ?? 'https://registry.npmjs.org/';
      const version = read('npm', ['view', `${name}@${from}`, 'version', '--registry', registry]);
      if (!version)
        throw new Error(
          `${name}@${from} is not on ${registry}, or there is no token to read it in your .npmrc`,
        );
      console.log(`  ${name}@${version}   (${registry})`);
      versions[name] = version;
      if (name.startsWith('@')) scopes.add(`${name.split('/')[0]}:registry=${registry}`);
    }
    exampleNpmrc = `${[...scopes].join('\n')}\n`;
  } else {
    log('Building the packages');
    run('pnpm', ['build', '--filter', './packages/*'], { cwd: ROOT });

    log('Starting a local registry with empty storage');
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    writeFileSync(
      join(work, 'verdaccio.yaml'),
      [
        `storage: ${JSON.stringify(join(work, 'storage'))}`,
        `auth:\n  htpasswd:\n    file: ${JSON.stringify(join(work, 'htpasswd'))}\n    max_users: 10`,
        'uplinks:\n  npmjs:\n    url: https://registry.npmjs.org/',
        'packages:',
        "  '@builderset/*':\n    access: $all\n    publish: $authenticated",
        "  'builderset':\n    access: $all\n    publish: $authenticated",
        "  '**':\n    access: $all\n    proxy: npmjs",
        'log: { type: stdout, format: pretty, level: error }',
        '',
      ].join('\n'),
    );
    // Verdaccio exports no package.json; it is a dev dependency of the workspace root.
    const verdaccioDir = join(ROOT, 'node_modules', 'verdaccio');
    const bin = JSON.parse(readFileSync(join(verdaccioDir, 'package.json'), 'utf8')).bin;
    const binPath = join(verdaccioDir, typeof bin === 'string' ? bin : bin.verdaccio);
    registry = spawn(
      process.execPath,
      [binPath, '--config', join(work, 'verdaccio.yaml'), '--listen', `127.0.0.1:${port}`],
      {
        stdio: 'inherit',
      },
    );
    for (let i = 0; ; i++) {
      if (
        await fetch(`${url}/-/ping`).then(
          (r) => r.ok,
          () => false,
        )
      )
        break;
      if (i > 60) throw new Error('the registry did not start');
      await new Promise((r) => setTimeout(r, 500));
    }
    // A throwaway user, so npm has a token to publish with.
    const user = await fetch(`${url}/-/user/org.couchdb.user:examples`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'examples', password: 'examples-password' }),
    }).then((r) => r.json());
    const npmrc = join(work, '.npmrc');
    writeFileSync(npmrc, `registry=${url}/\n//127.0.0.1:${port}/:_authToken=${user.token}\n`);
    env = { ...process.env, NPM_CONFIG_USERCONFIG: npmrc, npm_config_registry: `${url}/` };
    exampleNpmrc = `registry=${url}/\n`;

    log('Publishing the packages to it');
    for (const name of readdirSync(join(ROOT, 'packages'))) {
      const dir = join(ROOT, 'packages', name);
      if (!existsSync(join(dir, 'package.json'))) continue;
      const tarballs = join(work, 'tarballs', name);
      mkdirSync(tarballs, { recursive: true });
      run('pnpm', ['pack', '--pack-destination', tarballs], { cwd: dir });
      const tarball = join(
        tarballs,
        readdirSync(tarballs).find((f) => f.endsWith('.tgz')),
      );
      const unpacked = join(work, 'publish', name);
      mkdirSync(unpacked, { recursive: true });
      untar(tarball, unpacked);
      const manifestPath = join(unpacked, 'package', 'package.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      // The published copy only: it goes to this registry, whatever the real
      // package says (publishConfig points at GitHub Packages), and it is public here.
      delete manifest.private;
      delete manifest.publishConfig;
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      versions[manifest.name] = manifest.version;
      run(
        'npm',
        ['publish', join(unpacked, 'package'), '--registry', `${url}/`, '--tag', 'latest'],
        {
          env,
        },
      );
    }
  }

  const skipped = [];
  for (const [example, steps] of Object.entries(EXAMPLES)) {
    if (only.length && !only.includes(example)) continue;
    const own = JSON.parse(readFileSync(join(ROOT, 'examples', example, 'package.json'), 'utf8'));
    const missing = Object.keys({ ...own.dependencies, ...own.devDependencies }).filter(
      (dep) => unpublished[dep],
    );
    if (missing.length) {
      log(
        `Example ${example}: SKIPPED — it needs ${missing.map((dep) => `${dep} (${unpublished[dep]})`).join(', ')}`,
      );
      skipped.push(example);
      continue;
    }
    log(`Example ${example}: installed from the registry, outside the repository`);
    const target = join(work, 'examples', example);
    cpSync(join(ROOT, 'examples', example), target, {
      recursive: true,
      filter: (source) => !SKIP.has(source.split(/[\\/]/).pop()),
    });
    const manifestPath = join(target, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const field of ['dependencies', 'devDependencies'])
      for (const [dep, version] of Object.entries(manifest[field] ?? {}))
        if (String(version).startsWith('workspace:')) manifest[field][dep] = versions[dep];
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    writeFileSync(join(target, '.npmrc'), exampleNpmrc);
    run('npm', ['install', '--no-audit', '--no-fund'], { cwd: target, env });
    try {
      for (const [command, ...args] of steps) run(command, args, { cwd: target, env });
    } catch (error) {
      // Bring the browser report back into the repository, where CI uploads it.
      const report = join(target, 'playwright-report');
      if (existsSync(report))
        cpSync(report, join(ROOT, 'examples', example, 'playwright-report'), { recursive: true });
      throw error;
    }
  }
  log(
    skipped.length
      ? `Every example that ran passed; skipped: ${skipped.join(', ')}`
      : 'Every example passed',
  );
} catch (error) {
  failed = true;
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
} finally {
  registry?.kill();
  if (keep || failed) console.log(`\nThe temporary folder is kept: ${work}`);
  else rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
