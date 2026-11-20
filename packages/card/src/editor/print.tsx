'use client';

import { useEditorContext } from '@builderset/engine/editor';
import { Button } from '@builderset/engine/ui';
import { Printer } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { CardDocument } from '../core';
import { CardPrintSheet } from '../render';
import { useCard } from './context';

/**
 * "Print-ready sheet": the card's print sheet (`CardPrintSheet`) in a window
 * of its own, at real size with bleed and crop marks, and the browser's print
 * dialog over it — where "Save as PDF" makes the file a printer asks for.
 * A host that prints elsewhere (a print service, one card per member from its
 * own list) passes `onPrint` and gets the click instead.
 */
export function PrintButton({ children }: { children: ReactNode }) {
  const { store } = useEditorContext<CardDocument>();
  const { onPrint, records, assetUrl, viewer } = useCard();
  const [target, setTarget] = useState<Window | null>(null);

  useEffect(() => {
    if (!target) return;
    // The sheet needs the card's stylesheet: the opener's styles, copied over.
    for (const sheet of document.querySelectorAll('style, link[rel="stylesheet"]')) {
      target.document.head.append(sheet.cloneNode(true));
    }
    target.document.title = store.getState().doc.meta.name;
    const timer = window.setTimeout(() => {
      target.focus();
      target.print();
    }, 400);
    const onClose = () => {
      setTarget(null);
    };
    target.addEventListener('afterprint', onClose);
    target.addEventListener('pagehide', onClose);
    return () => {
      window.clearTimeout(timer);
      target.removeEventListener('afterprint', onClose);
      target.removeEventListener('pagehide', onClose);
    };
  }, [target, store]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        icon={<Printer aria-hidden="true" />}
        className="bst:justify-self-start"
        onClick={() => {
          if (onPrint) {
            onPrint(store.getState().doc);
            return;
          }
          setTarget(window.open('', '_blank', 'width=900,height=700'));
        }}
      >
        {children}
      </Button>
      {target
        ? createPortal(
            <CardPrintSheet
              document={store.getState().doc}
              records={records}
              assetUrl={assetUrl}
              words={viewer}
            />,
            target.document.body,
          )
        : null}
    </>
  );
}
