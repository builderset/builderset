import { useEffect } from 'react';

/**
 * Load a stylesheet — a Google Fonts URL — without ever suspending.
 *
 * Not `<link rel="stylesheet" precedence>`: React 19 treats that as a resource
 * and SUSPENDS the update that renders it until the sheet has loaded. Picking a
 * font changes the URL, the canvas suspends, and with no boundary closer than
 * the route's, the whole editor is swapped for its loading screen. Fonts are a
 * progressive enhancement — text shows in the fallback until they arrive — so
 * the sheet is appended to the head after paint instead, and kept: a second
 * request for the same URL is a no-op.
 */
export function useStylesheet(href: string | null | undefined): void {
  useEffect(() => {
    if (!href) return;
    const loaded = Array.from(document.head.querySelectorAll('link[data-stylesheet]')).some(
      (link) => link.getAttribute('data-stylesheet') === href,
    );
    if (loaded) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-stylesheet', href);
    document.head.appendChild(link);
  }, [href]);
}
