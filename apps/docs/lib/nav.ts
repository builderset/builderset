import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { source } from './source';

/**
 * The sidebar as plain data: one group per separator of the root meta.json
 * ("Getting started", "Guides", "Reference"), each a list of pages and
 * folders. Built on the server from the page tree, so the client gets strings.
 */
export interface NavPage {
  kind: 'page';
  name: string;
  url: string;
}
export interface NavFolder {
  kind: 'folder';
  name: string;
  /** The folder's own page (its index.mdx), if it has one. */
  url: string | null;
  pages: NavPage[];
}
export interface NavGroup {
  name: string;
  icon: 'start' | 'guides' | 'reference';
  items: (NavPage | NavFolder)[];
}

type TreeNode = ReturnType<typeof source.getPageTree>['children'][number];

const text = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''));

const ICONS: Record<string, NavGroup['icon']> = {
  'Getting started': 'start',
  Guides: 'guides',
  Reference: 'reference',
};

function pagesOf(node: TreeNode): NavPage[] {
  if (node.type === 'page') return [{ kind: 'page', name: text(node.name), url: node.url }];
  if (node.type === 'folder') return node.children.flatMap(pagesOf);
  return [];
}

export function navigation(): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const node of source.getPageTree().children) {
    if (node.type === 'separator') {
      const name = text(node.name);
      groups.push({ name, icon: ICONS[name] ?? 'guides', items: [] });
      continue;
    }
    if (!groups.length) groups.push({ name: 'Docs', icon: 'start', items: [] });
    const group = groups[groups.length - 1]!;
    if (node.type === 'page')
      group.items.push({ kind: 'page', name: text(node.name), url: node.url });
    else if (node.type === 'folder') {
      group.items.push({
        kind: 'folder',
        name: text(node.name),
        url: node.index?.url ?? null,
        pages: node.children.flatMap(pagesOf),
      });
    }
  }
  return groups;
}

/** Every page in reading order, with the group it belongs to. */
export function readingOrder(): { name: string; url: string; group: string; folder?: string }[] {
  return navigation().flatMap((group) =>
    group.items.flatMap((item) =>
      item.kind === 'page'
        ? [{ name: item.name, url: item.url, group: group.name }]
        : [
            ...(item.url
              ? [{ name: item.name, url: item.url, group: group.name, folder: item.name }]
              : []),
            ...item.pages.map((page) => ({ ...page, group: group.name, folder: item.name })),
          ],
    ),
  );
}

export function neighbours(url: string) {
  const order = readingOrder();
  const at = order.findIndex((page) => page.url === url);
  return {
    here: at === -1 ? null : order[at]!,
    previous: at > 0 ? order[at - 1]! : null,
    next: at !== -1 && at < order.length - 1 ? order[at + 1]! : null,
  };
}

/** The version the docs describe: the engine's, as the repository has it. */
export const VERSION: string = (
  JSON.parse(
    readFileSync(
      /*turbopackIgnore: true*/ join(
        /*turbopackIgnore: true*/ process.cwd(),
        '../../packages/engine/package.json',
      ),
      'utf8',
    ),
  ) as {
    version: string;
  }
).version;
