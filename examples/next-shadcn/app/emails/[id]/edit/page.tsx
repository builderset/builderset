import { notFound } from 'next/navigation';

import { readEmail } from '@/lib/store';

import { EmailEdit } from './email-edit';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const record = await readEmail(id);
  if (!record) notFound();
  return (
    <EmailEdit
      id={id}
      document={record.draft_document ?? record.document}
      savedAt={record.saved_at}
      status={record.status}
    />
  );
}
