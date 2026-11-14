/**
 * Finds the class strings in a package's source, for the prefix codemod and
 * for the test that keeps every class prefixed (docs/plan/steps/10, part C).
 *
 * A string is in a CLASS POSITION when it is:
 * - the value of a JSX attribute named `className` or `…ClassName`, or of an
 *   object property or a variable with such a name (`triggerClassName`,
 *   `const fieldClass`), including strings in a conditional or a template in it;
 * - an argument of `cn`, `clsx`, `cx` or `twMerge`, at any depth;
 * - in a `cva(…)`: the base, and each variant's value (never the variant's
 *   name, and never `defaultVariants`, whose values are names like 'outline').
 *
 * Inside a class position, both branches of `a ? b : c` are classes, the
 * right side of `a && b`, both sides of `||`, `??` and `+`. Nothing else is
 * followed: `x === 'hidden'` is a comparison, not a class.
 *
 * Every other string whose tokens are all Tailwind utilities is a CANDIDATE —
 * a class kept in a constant (`const SIZES = { sm: 'h-8 px-2' }`) — which a
 * person decides about.
 *
 * Never used on src/core: it has element types like 'table' and 'container'
 * and values like 'hidden', which are utilities by name and must not change.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PREFIX = 'bst:';
const require = createRequire(join(ROOT, 'package.json'));
export const ts = require('typescript');

const CLASS_CALLS = new Set(['cn', 'clsx', 'cx', 'twMerge']);
const isClassName = (name) => /^(class|className|[a-z]\w*ClassName|[a-z]\w*Class)$/.test(name);
/** Group markers are not utilities themselves; their variants are. */
const MARKER = /^(group|peer)(\/[\w-]+)?$/;

/** `isUtility(token)`: does Tailwind, with this product's theme, make CSS for it? */
export async function loadUtilityCheck() {
  const { __unstable__loadDesignSystem } = await import(
    pathToFileURL(require.resolve('@tailwindcss/node')).href
  );
  const base = join(ROOT, 'packages/engine/src/theme');
  const design = await __unstable__loadDesignSystem(readFileSync(join(base, 'index.css'), 'utf8'), {
    base,
  });
  const cache = new Map();
  return (token) => {
    if (MARKER.test(token.replace(PREFIX, ''))) return true;
    const candidate = token.startsWith(PREFIX) ? token : PREFIX + token;
    if (!cache.has(candidate))
      cache.set(candidate, design.candidatesToCss([candidate])[0] !== null);
    return cache.get(candidate);
  };
}

export function refuseCore(file) {
  if (file.split(/[\\/]/).includes('core')) throw new Error(`refusing a core file: ${file}`);
}

const calleeName = (call) => {
  const e = call.expression;
  return ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : '';
};
const nameOf = (name) =>
  name && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isPrivateIdentifier(name))
    ? name.text
    : '';

/**
 * Every string in the file: `{ node, text, start, end, classPosition, partial }`.
 * `start`/`end` are the offsets of the string's TEXT (inside the quotes), and
 * `partial` marks a template piece that touches a `${…}` on that side.
 */
export function stringsIn(file, sourceText = readFileSync(file, 'utf8')) {
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out = [];
  const seen = new Set();
  const emit = (node, classPosition) => {
    if (seen.has(node)) return;
    seen.add(node);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const start = node.getStart(source) + 1;
      out.push({
        node,
        text: node.text,
        start,
        end: node.getEnd() - 1,
        classPosition,
        partial: [false, false],
      });
    } else if (ts.isTemplateExpression(node)) {
      const pieces = [node.head, ...node.templateSpans.map((s) => s.literal)];
      pieces.forEach((piece, i) => {
        const start = piece.getStart(source) + 1;
        const end = piece.getEnd() - (i === pieces.length - 1 ? 1 : 2);
        out.push({
          node: piece,
          text: sourceText.slice(start, end),
          start,
          end,
          classPosition,
          partial: [i > 0, i < pieces.length - 1],
        });
      });
      for (const span of node.templateSpans) classWalk(span.expression, classPosition);
    }
  };
  /** Follow an expression that is in a class position. */
  const classWalk = (node, classPosition = true) => {
    if (!node) return;
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    )
      return emit(node, classPosition);
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node)
    )
      return classWalk(node.expression, classPosition);
    if (ts.isConditionalExpression(node)) {
      classWalk(node.whenTrue, classPosition);
      return classWalk(node.whenFalse, classPosition);
    }
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (op === ts.SyntaxKind.AmpersandAmpersandToken) return classWalk(node.right, classPosition);
      if (
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken ||
        op === ts.SyntaxKind.PlusToken
      ) {
        classWalk(node.left, classPosition);
        return classWalk(node.right, classPosition);
      }
      return;
    }
    if (ts.isArrayLiteralExpression(node))
      return node.elements.forEach((e) => classWalk(e, classPosition));
    if (ts.isCallExpression(node) && CLASS_CALLS.has(calleeName(node)))
      return node.arguments.forEach((a) => classArg(a));
  };
  /** An argument of cn/clsx: also clsx's `{ 'a b': condition }` keys. */
  const classArg = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const p of node.properties)
        if (
          ts.isPropertyAssignment(p) &&
          (ts.isStringLiteral(p.name) || ts.isNoSubstitutionTemplateLiteral(p.name))
        )
          emit(p.name, true);
      return;
    }
    classWalk(node);
  };
  const cva = (call) => {
    const [baseArg, config] = call.arguments;
    classWalk(baseArg);
    if (!config || !ts.isObjectLiteralExpression(config)) return;
    for (const prop of config.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = nameOf(prop.name);
      if (key === 'variants' && ts.isObjectLiteralExpression(prop.initializer)) {
        for (const group of prop.initializer.properties)
          if (ts.isPropertyAssignment(group) && ts.isObjectLiteralExpression(group.initializer))
            for (const value of group.initializer.properties)
              if (ts.isPropertyAssignment(value)) classWalk(value.initializer);
      }
      if (key === 'compoundVariants' && ts.isArrayLiteralExpression(prop.initializer)) {
        for (const entry of prop.initializer.elements)
          if (ts.isObjectLiteralExpression(entry))
            for (const p of entry.properties)
              if (ts.isPropertyAssignment(p) && ['class', 'className'].includes(nameOf(p.name)))
                classWalk(p.initializer);
      }
    }
  };
  const visit = (node) => {
    if (ts.isJsxAttribute(node) && isClassName(nameOf(node.name)) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) emit(init, true);
      else if (ts.isJsxExpression(init)) classWalk(init.expression);
    } else if (ts.isPropertyAssignment(node) && isClassName(nameOf(node.name))) {
      classWalk(node.initializer);
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      isClassName(node.name.text)
    ) {
      classWalk(node.initializer);
    } else if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      if (name === 'cva') cva(node);
      else if (CLASS_CALLS.has(name)) node.arguments.forEach((a) => classArg(a));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  // Every other string, for the candidate list. Not import paths, not
  // property names, not the text of a type, not a CSS value in a `style`
  // (`display: 'inline-block'`).
  const rest = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isLiteralTypeNode(node))
      return;
    if (
      (ts.isJsxAttribute(node) || ts.isPropertyAssignment(node)) &&
      ['style', 'cssText'].includes(nameOf(node.name))
    )
      return;
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateExpression(node)) &&
      !seen.has(node)
    ) {
      const parent = node.parent;
      const isKey =
        parent &&
        (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) &&
        parent.name === node;
      if (!isKey) emit(node, false);
    }
    ts.forEachChild(node, rest);
  };
  rest(source);
  return out.sort((a, b) => a.start - b.start);
}

/** Whitespace-separated tokens, with their offsets in the string. */
export function tokensOf(text) {
  return [...text.matchAll(/\S+/g)].map((m) => ({ token: m[0], at: m.index }));
}

/** A token is a partial piece of a class when it touches a `${…}`. */
export function isPartial(entry, { token, at }) {
  const [before, after] = entry.partial;
  return (before && at === 0) || (after && at + token.length === entry.text.length);
}

/** Is this string, outside a class position, made only of utilities? */
export function looksLikeClasses(entry, isUtility) {
  const tokens = tokensOf(entry.text);
  if (!tokens.length || entry.text.includes('\n')) return false;
  const usable = tokens.filter((t) => !isPartial(entry, t));
  if (!usable.length || !usable.every(({ token }) => isUtility(token))) return false;
  // One word alone ('hidden', 'block', 'table') is usually a value, not a class;
  // one with a dash or a variant ('px-2', 'hover:underline') usually a class.
  return usable.length >= 2 || /[-:[]/.test(usable[0].token);
}

export const relative = (file) =>
  file
    .slice(ROOT.length + 1)
    .split(sep)
    .join('/');
