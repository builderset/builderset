import { createArticleRegistry, type ArticleDocument } from '@builderset/article';
import { ArticleRenderer, jsonLdString, structuredData } from '@builderset/article/render';

const registry = createArticleRegistry();
const media = (key: string) => `https://cdn.example.com/${key}`;

/** An article page with its schema.org data, so search engines read it as an article. */
export function ArticlePage({ document, url }: { document: ArticleDocument; url: string }) {
  const data = structuredData(document, registry, {
    url,
    resolveMedia: media,
    publisherName: 'Acme',
  });
  return (
    <main>
      <script
        type="application/ld+json"
        // jsonLdString escapes <, > and &: the article's text cannot close the script.
        dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
      />
      <ArticleRenderer document={document} registry={registry} resolveMedia={media} locale="en" />
    </main>
  );
}
