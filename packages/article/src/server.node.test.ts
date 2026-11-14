import * as article from '@builderset/article';
import * as host from '@builderset/article/host';
import * as render from '@builderset/article/render';
import { describe, expect, it } from 'vitest';

/**
 * The entries a server imports load in plain Node: no `window`, no
 * `document`, no `DOMParser` (docs/plan/steps/07). The imports
 * above are the test — a module that touched the DOM while loading would fail
 * this file before any test ran.
 */
describe('on a server', () => {
  it('checks an article, and refuses to guess a parser', () => {
    expect(typeof window).toBe('undefined');
    const registry = article.createArticleRegistry();
    const doc = article.createArticleDocument({ title: 'On a server' });
    expect(article.checkArticle(doc, registry).filter(article.isPublishBlocking)).toEqual([]);
    expect(() => article.importHTML('<p>Hi</p>', registry)).toThrow('{ parser }');
  });

  it('loads the renderer and the host entry', () => {
    expect(typeof render.ArticleRenderer).toBe('function');
    expect(typeof host.createRestHost).toBe('function');
  });
});
