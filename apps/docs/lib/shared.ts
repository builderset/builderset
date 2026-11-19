import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Builderset';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';

/** The repository the "Edit on GitHub" links point at. */
export const gitConfig = {
  user: 'builderset',
  repo: 'builderset',
  branch: 'development',
};

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}
