'use client';

import { useEffect, useState } from 'react';

import { OPEN_IMPORT_HTML } from './context';
import { ImportHtmlDialog } from './import-html-dialog';

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  );
}

/**
 * Opens the Import HTML drawer — from the Modules tab's button, or when a
 * whole email is pasted anywhere outside a text field (a designer's usual
 * move: copy the code, click the canvas, paste).
 */
export function ImportHtmlHost() {
  const [open, setOpen] = useState(false);
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    const openDialog = () => {
      setPasted('');
      setOpen(true);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (typing(event.target)) return;
      const data = event.clipboardData;
      const rich = data ? data.getData('text/html') : '';
      const html = rich !== '' ? rich : data ? data.getData('text/plain') : '';
      if (!/<(table|body|html|div|p|h[1-6])[\s>]/i.test(html)) return;
      event.preventDefault();
      setPasted(html);
      setOpen(true);
    };
    window.addEventListener(OPEN_IMPORT_HTML, openDialog);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener(OPEN_IMPORT_HTML, openDialog);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  return (
    <ImportHtmlDialog
      open={open}
      initialHtml={pasted}
      onClose={() => {
        setOpen(false);
      }}
    />
  );
}
