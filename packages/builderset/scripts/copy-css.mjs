#!/usr/bin/env node
/**
 * The stylesheets this package passes on as they are: the article's
 * content.css (a rendered article on a site, no editor), the form's form.css
 * (a form on a public page) and the shadcn
 * bridges. Run after the kits are built.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const copy = (from, to) => {
  mkdirSync(dirname(join(here, to)), { recursive: true });
  copyFileSync(resolve(here, from), join(here, to));
};
copy('../article/dist/content.css', 'dist/article/content.css');
copy('../form/dist/form.css', 'dist/form/form.css');
copy('../engine/src/theme/shadcn.css', 'dist/theme/shadcn.css');
copy('../engine/src/theme/shadcn-hsl.css', 'dist/theme/shadcn-hsl.css');
