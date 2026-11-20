'use client';

import '@builderset/card/styles.css';

import { createCardRegistry, type CardDocument, type CardRecord } from '@builderset/card';
import { CardEditor } from '@builderset/card/editor';
import { createRestHost } from '@builderset/card/host';
import { de } from '@builderset/card/locales/de';
import { sq } from '@builderset/card/locales/sq';
import { useMemo, useState } from 'react';

import { MEMBER_FIELDS } from './card-fields';

const registry = createCardRegistry();

/** The row's facts the editor shows and changes: approved (published), when. */
interface RowFacts {
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

interface Props {
  id: string;
  card: CardDocument;
  savedAt: string;
  status: 'draft' | 'published';
  /** Your app's notices: the editor reports a failed save or upload through it. */
  toast: (kind: 'success' | 'error' | 'info', message: string) => void;
  /** A few real members to design with: the editor's example data and its preview switch. */
  members: readonly CardRecord[];
  /** How many members the chosen list holds: "Print 248 cards". */
  memberCount: number;
}

export function CardEdit({ id, card, savedAt, status, members, memberCount, toast }: Props) {
  const [record, setRecord] = useState<RowFacts>({
    status,
    scheduledAt: null,
    publishedAt: null,
  });
  const host = useMemo(
    () =>
      createRestHost<CardDocument>({
        baseUrl: `/api/cards/${encodeURIComponent(id)}`,
        uploadUrl: '/api/uploads',
        resolveMedia: (key) => `/api/uploads/${key}`,
        savedAt,
        toast,
      }),
    [id, savedAt, toast],
  );

  return (
    <CardEditor
      document={card}
      registry={registry}
      host={host}
      record={record}
      onRecordChange={(patch) => {
        setRecord((current) => ({ ...current, ...patch }));
      }}
      onBack={() => {
        history.back();
      }}
      fields={MEMBER_FIELDS}
      records={members}
      memberCount={memberCount}
      // Your print run: a page of yours that draws the saved design for every
      // member of the list (CardPrintSheet, below). Without it the editor prints
      // a sheet of the example members.
      onPrint={() => {
        window.open(`/cards/${encodeURIComponent(id)}/print`, '_blank', 'noopener');
      }}
      locale="auto"
      locales={{ sq, de }}
      storageKey={`card:${id}`}
      savedAt={savedAt}
    />
  );
}
