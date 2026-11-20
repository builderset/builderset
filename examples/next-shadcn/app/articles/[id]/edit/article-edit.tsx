'use client';

// The article kit's own package — the one a project installs today (the all-in-one
// `builderset` package comes to npm with the launch; /styled still uses it).
import '@builderset/article/styles.css';
import '@builderset/article/theme/shadcn.css';

import type { ArticleDocument } from '@builderset/article';
import { ArticleEditor } from '@builderset/article/editor';
import { createMemoryHost } from '@builderset/article/host';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export function ArticleEdit({ id, document }: { id: string; document: ArticleDocument }) {
  const router = useRouter();
  // In memory: the email page shows a real API; this one shows the article editor.
  const host = useMemo(() => createMemoryHost<ArticleDocument>({ document }), [document]);
  const [record, setRecord] = useState({
    status: 'draft',
    scheduledAt: null as string | null,
    publishedAt: null as string | null,
    slug: id,
    locale: 'en',
  });
  return (
    <ArticleEditor
      document={document}
      host={host}
      record={record}
      onRecordChange={(patch) => {
        setRecord((current) => ({ ...current, ...patch }));
      }}
      onBack={() => {
        router.push('/');
      }}
      siteUrl="http://localhost:5299/blog"
      theme="auto"
    />
  );
}
