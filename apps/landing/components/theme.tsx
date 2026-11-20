'use client';

import { Moon, Sun } from 'lucide-react';

const KEY = 'bs-site-theme';

/**
 * Runs before the page paints (an inline script in the layout's head): the
 * theme this visitor chose last time, and the class that lets blocks wait to
 * be revealed — only once a script runs, so nothing is hidden without one.
 */
export const HEAD_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')d.setAttribute('data-theme',t)}catch(e){}if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('lp-anim')})();`;

function isDark(): boolean {
  const forced = document.documentElement.getAttribute('data-theme');
  if (forced) return forced === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply(next: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
}

/** Light or dark. The new theme spreads out in a circle from where you clicked. */
export function ThemeToggle() {
  return (
    <button
      type="button"
      className="lp-iconbtn lp-theme"
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
        const at = `${String(x)}px ${String(y)}px`;
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        const root = document.documentElement;
        root.classList.add('lp-theme-reveal');
        const transition = document.startViewTransition(() => {
          apply(next);
        });
        void transition.ready.then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${at})`, `circle(${String(radius)}px at ${at})`] },
            {
              duration: 700,
              easing: 'cubic-bezier(0.65, 0, 0.25, 1)',
              pseudoElement: '::view-transition-new(root)',
            },
          );
        });
        const settle = () => {
          root.classList.remove('lp-theme-reveal');
        };
        transition.finished.then(settle, settle);
      }}
    >
      <Moon className="moon" size={17} />
      <Sun className="sun" size={17} />
    </button>
  );
}
