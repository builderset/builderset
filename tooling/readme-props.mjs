#!/usr/bin/env node
/**
 * Writes the props tables in each package's README from the built type files
 * (run after `pnpm build`):
 *
 *   node tooling/readme-props.mjs           rewrite the tables
 *   node tooling/readme-props.mjs --check   exit 1 if a table is out of date
 *
 * A table sits between two markers in a README:
 *
 *   <!-- props: editor/index.d.ts ArticleEditor -->
 *   …generated…
 *   <!-- /props -->
 *
 * The path is relative to the package's dist/; the names after it limit the
 * table to those components (default: every exported component). A prop's
 * description is its JSDoc. Props a component takes from React's or Radix's
 * types are summarised in one line rather than listed.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(join(ROOT, 'package.json'))('typescript');
const check = process.argv.includes('--check');
const BLOCK = /(<!-- props: ([^\s]+)((?: [\w]+)*) -->\n)[\s\S]*?(<!-- \/props -->)/g;

const cell = (text) =>
  text
    .replace(/\|/g, '\\|')
    .replace(/\s*\n\s*/g, ' ')
    .trim();

function tables(file, only) {
  const program = ts.createProgram([file], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2023,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  if (!source) throw new Error(`${file} does not exist: run pnpm build`);
  const ours = (decl) => {
    const name = decl.getSourceFile().fileName.split(sep).join('/');
    return name.includes('/packages/') && !name.includes('/node_modules/');
  };
  const print = (type, node) => checker.typeToString(type, node, ts.TypeFormatFlags.NoTruncation);
  // TypeScript orders a union's members by when it met each type, which
  // changes between runs; a table must not. A named type prints as its name.
  const typeText = (type, node) => {
    let text = print(type, node);
    if (type.isUnion() && !type.aliasSymbol) {
      const members = new Set(type.types.map((t) => print(t, node)));
      if (members.delete('true') && members.delete('false')) members.add('boolean');
      members.delete('undefined');
      const last = (m) => (m === 'null' ? 1 : 0);
      text = [...members].sort((a, b) => last(a) - last(b) || a.localeCompare(b)).join(' | ');
    } else text = text.replace(/ \| undefined$/, '');
    return text.length > 70 ? `${text.slice(0, 67)}…` : text;
  };
  const out = [];
  const symbols = checker
    .getExportsOfModule(checker.getSymbolAtLocation(source))
    .filter((s) => /^[A-Z]/.test(s.getName()) && (!only.length || only.includes(s.getName())))
    .sort((a, b) =>
      only.length
        ? only.indexOf(a.getName()) - only.indexOf(b.getName())
        : a.getName().localeCompare(b.getName()),
    );
  for (const symbol of symbols) {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const decl = target.valueDeclaration;
    if (!decl) continue;
    const signature = checker.getTypeOfSymbolAtLocation(target, decl).getCallSignatures()[0];
    if (!signature) continue;
    out.push(`#### \`${symbol.getName()}\``, '');
    const param = signature.getParameters()[0];
    if (!param) {
      out.push('No props.', '');
      continue;
    }
    const rows = [];
    const foreign = new Set();
    for (const prop of checker.getTypeOfSymbolAtLocation(param, decl).getApparentProperties()) {
      const pdecl = prop.declarations?.[0];
      if (!pdecl) continue;
      if (!ours(pdecl)) {
        const from = pdecl.getSourceFile().fileName;
        foreign.add(
          from.includes('@radix-ui')
            ? 'Radix'
            : from.includes('@types/react')
              ? 'React'
              : 'its library',
        );
        continue;
      }
      const required = (prop.flags & ts.SymbolFlags.Optional) === 0 ? 'yes' : '';
      const doc = ts.displayPartsToString(prop.getDocumentationComment(checker));
      const type = typeText(checker.getTypeOfSymbolAtLocation(prop, pdecl), pdecl);
      rows.push(`| \`${prop.getName()}\` | \`${cell(type)}\` | ${required} | ${cell(doc)} |`);
    }
    if (rows.length)
      out.push(
        '| Prop | Type | Required | What it does |',
        '| --- | --- | --- | --- |',
        ...rows,
        '',
      );
    if (foreign.size)
      out.push(
        `${rows.length ? 'Plus' : 'Takes'} the props of the element it draws (${[...foreign].join(', ')}).`,
        '',
      );
  }
  return out.join('\n');
}

let stale = 0;
for (const name of readdirSync(join(ROOT, 'packages'))) {
  const readme = join(ROOT, 'packages', name, 'README.md');
  if (!existsSync(readme)) continue;
  const before = readFileSync(readme, 'utf8').replace(/\r\n/g, '\n');
  const generated = before.replace(BLOCK, (_, open, entry, names, close) => {
    const only = names.trim() ? names.trim().split(/\s+/) : [];
    return `${open}\n${tables(join(ROOT, 'packages', name, 'dist', entry), only)}\n${close}`;
  });
  // Formatted as `pnpm format` would, so a current README compares equal.
  const after = await prettier.format(generated, {
    ...(await prettier.resolveConfig(readme)),
    filepath: readme,
  });
  if (after === before) continue;
  stale += 1;
  if (check) console.log(`✗ packages/${name}/README.md: the props tables are out of date`);
  else {
    writeFileSync(readme, after);
    console.log(`wrote packages/${name}/README.md`);
  }
}
if (check && stale) {
  console.log('Run pnpm build, then node tooling/readme-props.mjs, then pnpm format.');
  process.exit(1);
}
