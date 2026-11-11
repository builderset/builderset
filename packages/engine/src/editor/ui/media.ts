'use client';

import { useSyncExternalStore } from 'react';

/**
 * A media query, as React state.
 *
 * ── `useSyncExternalStore` rather than `useState` + `useEffect` ──────────────
 * A media query has a value on the very first paint, and an effect runs after
 * it. So the effect version renders the wrong branch once and then corrects it,
 * which for a control that is a dropdown on desktop and a sheet on a phone means
 * mounting one and immediately throwing it away. `useSyncExternalStore` also
 * takes a separate server snapshot, which turns what would be a hydration ERROR
 * into a re-render.
 *
 * ── The server snapshot is a decision, not a default ─────────────────────────
 * There is no viewport on the server, so each caller says what to assume. The
 * back office is a desktop tool, so its callers assume desktop: that is the
 * render worth getting right without JavaScript, and the correction on a phone
 * costs one re-render of one control.
 */
export function useMediaQuery(query: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Tailwind's `sm`. Below it the topbar's menus become bottom sheets. */
export const SM = '(min-width: 40rem)';
/** Tailwind's `lg`. Below it the sidebar is a drawer rather than a column. */
export const LG = '(min-width: 64rem)';

/**
 * True on a phone — below `sm`, where a dropdown anchored to a 36px circle in
 * the top corner is the wrong control and a sheet from the bottom edge is the
 * right one.
 */
export function useIsCompact(): boolean {
  return !useMediaQuery(SM, true);
}

/** True where the sidebar is a permanent column rather than a drawer. */
export function useIsDesktop(): boolean {
  return useMediaQuery(LG, true);
}
