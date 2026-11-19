'use client';

import { useEffect } from 'react';

import { Icon } from './icons';

const KEY = 'bs-docs-theme';

/**
 * Runs before the page paints (an inline script in the layout's head): the
 * theme this reader chose last time, or none — the system's.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

function isDark(): boolean {
  const forced = document.documentElement.getAttribute('data-theme');
  if (forced) return forced === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function mark() {
  document.documentElement.setAttribute('data-bs-dark', String(isDark()));
}

function apply(next: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  mark();
}

/** Light or dark. The new theme spreads out in a circle from where you clicked. */
export function ThemeToggle() {
  useEffect(() => {
    mark();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', mark);
    return () => {
      media.removeEventListener('change', mark);
    };
  }, []);

  return (
    <button
      type="button"
      className="bs-iconbtn bs-theme"
      aria-label="Switch between light and dark"
      title="Light or dark"
      onClick={(event) => {
        const next = isDark() ? 'light' : 'dark';
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (still || !('startViewTransition' in document)) {
          apply(next);
          return;
        }
        const x = event.clientX || window.innerWidth - 40;
        const y = event.clientY || 30;
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        const root = document.documentElement;
        root.classList.add('bs-theme-reveal');
        const transition = document.startViewTransition(() => {
          apply(next);
        });
        void transition.ready.then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            {
              duration: 700,
              easing: 'cubic-bezier(0.65, 0, 0.25, 1)',
              pseudoElement: '::view-transition-new(root)',
            },
          );
        });
        const settle = () => {
          root.classList.remove('bs-theme-reveal');
        };
        transition.finished.then(settle, settle);
      }}
    >
      <Icon name="moon" className="moon" />
      <Icon name="sun" className="sun" />
    </button>
  );
}
