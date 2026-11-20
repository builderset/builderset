import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { codeToHtml } from 'shiki';

import { CopyButton } from './copy-button';

/**
 * A code block read from a file at build time, as on the docs site: no code on
 * this page is typed in by hand. `path` starts at apps/landing; `region` takes
 * the lines between `// #region name` and `// #endregion name`; `lines` takes
 * a range, counted from 1 and inclusive.
 */
export async function Code({
  path,
  region,
  lines,
  lang,
  title,
}: {
  path: string;
  region?: string;
  lines?: readonly [number, number];
  lang: string;
  title?: string;
}) {
  // Read once, at build time: the page is static, so nothing needs tracing.
  const source = readFileSync(
    /*turbopackIgnore: true*/ join(/*turbopackIgnore: true*/ process.cwd(), path),
    'utf8',
  );
  let code = region ? regionOf(source, region, path) : source;
  if (lines)
    code = code
      .split(/\r?\n/)
      .slice(lines[0] - 1, lines[1])
      .join('\n');
  code = dedent(code).trimEnd();
  const html = await codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
  return (
    <figure className="lp-code">
      {title ? (
        <figcaption>
          <span className="file">
            <i aria-hidden="true" />
            {title}
          </span>
          <CopyButton text={code} label="Copy" />
        </figcaption>
      ) : (
        <CopyButton text={code} floating />
      )}
      <div className="lp-code-body" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}

function regionOf(source: string, region: string, path: string): string {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `// #region ${region}`);
  const end = lines.findIndex((line) => line.trim() === `// #endregion ${region}`);
  if (start === -1 || end <= start) throw new Error(`No region "${region}" in ${path}`);
  return lines.slice(start + 1, end).join('\n');
}

/** Strips the indentation every non-blank line shares, so a slice reads flush left. */
function dedent(code: string): string {
  const lines = code.split('\n');
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => /^ */.exec(line)?.[0].length ?? 0);
  const common = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(common)).join('\n');
}
