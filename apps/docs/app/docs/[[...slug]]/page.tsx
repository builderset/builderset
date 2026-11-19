import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Reveal, Toc } from '@/components/docs/page-parts';
import { getMDXComponents } from '@/components/mdx';
import { neighbours, VERSION } from '@/lib/nav';
import { getPageImageUrl, gitConfig } from '@/lib/shared';
import { source } from '@/lib/source';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const { here, previous, next } = neighbours(page.url);
  const words = (await page.data.getText('processed')).split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 230));
  const editUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/apps/docs/content/docs/${encodeURI(page.path)}`;

  return (
    <>
      <main className="bs-main" id="top">
        <article className="bs-article" id="bs-article">
          <nav className="bs-crumbs" aria-label="Breadcrumb">
            <Link href="/docs">Docs</Link>
            {here ? (
              <>
                <span aria-hidden="true">/</span>
                <span>{here.group}</span>
                {here.folder && here.folder !== page.data.title ? (
                  <>
                    <span aria-hidden="true">/</span>
                    <span>{here.folder}</span>
                  </>
                ) : null}
              </>
            ) : null}
          </nav>
          <h1>{page.data.title}</h1>
          {page.data.description ? <p className="bs-lead">{page.data.description}</p> : null}
          <div className="bs-meta">
            <span>
              <b>Version</b> {VERSION}
            </span>
            <span>
              <b>Reading</b> {minutes} min
            </span>
          </div>
          <div className="bs-prose">
            <MDX components={getMDXComponents()} />
          </div>
          <nav className="bs-pagenav" aria-label="Pages">
            {previous ? (
              <Link href={previous.url}>
                <small>Previous</small>
                {previous.name}
              </Link>
            ) : null}
            {next ? (
              <Link className="next" href={next.url}>
                <small>Next</small>
                {next.name}
              </Link>
            ) : null}
          </nav>
        </article>
      </main>
      <Toc
        entries={page.data.toc.map((entry) => ({
          title: entry.title,
          url: entry.url,
          depth: entry.depth,
        }))}
        markdownUrl={`${page.url}.md`}
        editUrl={editUrl}
      />
      <Reveal />
    </>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();
  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: { images: getPageImageUrl(page).url },
  };
}
