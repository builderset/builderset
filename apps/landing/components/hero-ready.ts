import { useEffect } from 'react';

/** What every editor in the hero's product shot takes. */
export interface HeroKitProps {
  /** Called once the editor has mounted and painted: the shot may show it now. */
  onReady: () => void;
}

/** Calls `onReady` after the editor's first paint (two frames after mounting). */
export function useReady(onReady: () => void) {
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(onReady);
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [onReady]);
}

/** The facts every editor in the shot is given: a draft, never saved. */
export const DRAFT = { status: 'draft', scheduledAt: null, publishedAt: null } as const;

/** Every picture in the shot is the site's own sample. */
export const resolveMedia = () => '/sample.png';
