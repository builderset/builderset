'use client';

import { useSyncExternalStore } from 'react';

/**
 * `<html lang>`, kept up to date: what `locale="auto"` follows. On the server,
 * where there is no document, it is `en`.
 */
export function useHtmlLang(): string {
  return useSyncExternalStore(
    (notify) => {
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      return () => {
        observer.disconnect();
      };
    },
    () => document.documentElement.lang || 'en',
    () => 'en',
  );
}
