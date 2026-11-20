'use client';

import '@builderset/popup/popup.css';

import type { PopupDocument } from '@builderset/popup';
import { PopupView } from '@builderset/popup/render';
import { useEffect, useState } from 'react';

/** What `GET /api/public/popups` answers: the published popups this page may show. */
interface LivePopup {
  id: string;
  version: number;
  document: PopupDocument;
}

// #region popups
/**
 * In your site's layout, once: the popups for the page the visitor is on. The
 * server already left out those whose pages, language or dates do not match;
 * each `PopupView` applies the rest of its rules here — the device, new or
 * returning, how often — then waits for its trigger.
 */
export function SitePopups({ path, locale, firstName }: Props) {
  const [popups, setPopups] = useState<LivePopup[]>([]);
  useEffect(() => {
    const query = new URLSearchParams({ path, locale });
    void fetch(`/api/public/popups?${query.toString()}`)
      .then((response) => (response.ok ? (response.json() as Promise<LivePopup[]>) : []))
      .then(setPopups);
  }, [path, locale]);

  return popups.map((popup) => (
    <PopupView
      // A new page is a new visit to the rules: remount on a client-side navigation.
      key={`${popup.id}:${path}`}
      document={popup.document}
      // The browser remembers it under this name: shown, closed, filled in.
      storageKey={popup.id}
      locale={locale}
      data={{ visitor: { first_name: firstName }, page: { title: document.title } }}
      assetUrl={(key) => `https://cdn.example.com/${key}`}
      // For counting: 'shown', 'closed', 'clicked', 'submitted'.
      onEvent={(event) => {
        navigator.sendBeacon(
          `/api/public/popups/${popup.id}/events`,
          new Blob([JSON.stringify({ event })], { type: 'application/json' }),
        );
      }}
      // Its inputs' answers, already checked as the server will check them.
      onSubmit={async (values) => {
        const response = await fetch(`/api/public/popups/${popup.id}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values, path, locale }),
        });
        // false keeps the visitor on the form; anything else shows the thank-you.
        return response.ok;
      }}
    />
  ));
}
// #endregion popups

interface Props {
  path: string;
  locale: string;
  firstName?: string | undefined;
}
