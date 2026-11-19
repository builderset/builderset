import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { codeToHtml } from 'shiki';

import { CopyButton } from './copy-button';

/**
 * A code block read from a file at build time, as on the docs site: no code on
 * this page is typed in by hand. `path` starts at apps/landing; `region` takes
 * the lines between `// #region name` and `// #endregion name`.
 */
export async function Code({
  path,
  region,
  lang,
  title,
}: {
  path: string;
  region?: string;
  lang: string;
  title?: string;
}) {
  // Read once, at build time: the page is static, so nothing needs tracing.
  const source = readFileSync(
    /*turbopackIgnore: true*/ join(/*turbopackIgnore: true*/ process.cwd(), path),
    'utf8',
  );
  const code = (region ? regionOf(source, region, path) : source).trimEnd();
  const html = await codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
  return (
    <figure className="bs-code">
      {title ? (
        <figcaption>
          <span>{title}</span>
          <CopyButton text={code} />
        </figcaption>
      ) : (
        <CopyButton text={code} floating />
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
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
