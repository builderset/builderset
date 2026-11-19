'use client';

// #region styles
import '@builderset/email/styles.css';
// Your shadcn tokens, mapped to the editor's variables. Leave it out without shadcn.
import '@builderset/email/theme/shadcn.css';
// #endregion styles

import { createEmailRegistry, type EmailDocument } from '@builderset/email';
import { createRestHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

// The editor runs in the browser only.
const EmailEditor = dynamic(
  () => import('@builderset/email/editor').then((module) => module.EmailEditor),
  { ssr: false, loading: () => <p className="p-8">Loading the editor…</p> },
);

export function EmailEdit({
  id,
  document,
  savedAt,
  status,
}: {
  id: string;
  document: EmailDocument;
  savedAt: string;
  status: string;
}) {
  const router = useRouter();
  const registry = useMemo(() => createEmailRegistry(), []);
  const [record, setRecord] = useState({
    status,
    scheduledAt: null as string | null,
    publishedAt: null as string | null,
  });
  const host = useMemo(
    () =>
      createRestHost<EmailDocument>({
        baseUrl: `/api/emails/${id}`,
        resolveMedia: (key) => `https://cdn.example.com/${key}`,
        toast: (kind, message) => {
          console.info(`[${kind}] ${message}`);
        },
        savedAt,
        // This API has no versions, saved sections, previews or oEmbed: the
        // editor hides those features.
        paths: { revisions: null, sections: null, oembed: null, preview: null },
        onRecord: (next) => {
          setRecord((current) => ({
            status: next.status ?? current.status,
            scheduledAt: next.scheduledAt === undefined ? current.scheduledAt : next.scheduledAt,
            publishedAt: next.publishedAt === undefined ? current.publishedAt : next.publishedAt,
          }));
        },
      }),
    [id, savedAt],
  );
  return (
    <EmailEditor
      document={document}
      registry={registry}
      host={host}
      type={null}
      brand={DEFAULT_BRAND}
      record={record}
      onBack={() => {
        router.push('/');
      }}
      theme="auto"
    />
  );
}
