'use client';

import '@builderset/popup/styles.css';

import { createPopupRegistry, type PopupDocument } from '@builderset/popup';
import { PopupEditor } from '@builderset/popup/editor';
import { createRestHost } from '@builderset/popup/host';
import { de } from '@builderset/popup/locales/de';
import { sq } from '@builderset/popup/locales/sq';
import { useMemo, useState } from 'react';

import { PAGE_FIELDS } from './popup-fields';

const registry = createPopupRegistry();

/** The row's facts the editor shows and changes: approved (published), when. */
interface RowFacts {
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

interface Props {
  id: string;
  popup: PopupDocument;
  savedAt: string;
  status: 'draft' | 'published';
  /** Your app's notices: the editor reports a failed save or upload through it. */
  toast: (kind: 'success' | 'error' | 'info', message: string) => void;
}

export function PopupEdit({ id, popup, savedAt, status, toast }: Props) {
  const [record, setRecord] = useState<RowFacts>({
    status,
    scheduledAt: null,
    publishedAt: null,
  });
  const host = useMemo(
    () =>
      createRestHost<PopupDocument>({
        baseUrl: `/api/popups/${encodeURIComponent(id)}`,
        uploadUrl: '/api/uploads',
        resolveMedia: (key) => `/api/uploads/${key}`,
        savedAt,
        toast,
      }),
    [id, savedAt, toast],
  );

  return (
    <PopupEditor
      document={popup}
      registry={registry}
      host={host}
      record={record}
      onRecordChange={(patch) => {
        setRecord((current) => ({ ...current, ...patch }));
      }}
      onBack={() => {
        history.back();
      }}
      fields={PAGE_FIELDS}
      // Your brand first in every colour field.
      colors={[{ value: '#e06a1b', label: 'Brand', hex: '#e06a1b' }]}
      locale="auto"
      locales={{ sq, de }}
      contentLocales={['sq', 'en']}
      storageKey={`popup:${id}`}
      savedAt={savedAt}
    />
  );
}
