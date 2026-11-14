// A rendered article, on the server: no editor code reaches this page.
import 'builderset/article/content.css';

import { ArticleRenderer, type ImageProps } from 'builderset/article/render';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { articleRegistry, readArticle } from '@/lib/store';

/** next/image needs a size; the article gives one when it knows it. */
function Picture({ width, height, loading, sizes, ...props }: ImageProps) {
  return (
    <Image
      {...props}
      width={width ?? 1200}
      height={height ?? 800}
      loading={loading}
      sizes={sizes ?? '(max-width: 768px) 100vw, 768px'}
    />
  );
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const document = readArticle((await params).slug);
  if (!document) notFound();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <ArticleRenderer
        document={document}
        registry={articleRegistry}
        // Every picture is the example's own sample image: an example makes no
        // request to a third party.
        resolveMedia={() => '/sample.png'}
        locale="en"
        linkComponent={Link}
        imageComponent={Picture}
      />
    </main>
  );
}
