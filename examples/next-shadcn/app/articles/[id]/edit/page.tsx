import { notFound } from 'next/navigation';

import { readArticle } from '@/lib/store';

import { ArticleEdit } from './article-edit';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const document = readArticle(id);
  if (!document) notFound();
  return <ArticleEdit id={id} document={document} />;
}
