'use client';

import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Logo } from './logo';
import { ThemeToggle } from './theme';

const SECTIONS = [
  { href: '#editor', label: 'Live editor' },
  { href: '#how', label: 'How it fits' },
  { href: '#kits', label: 'Kits' },
];

/** The top bar: frosted, and lifted off the page once it scrolls. */
export function Nav({
  docs,
  github,
  start,
  version,
}: {
  docs: string;
  github: string;
  start: string;
  version: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const close = () => {
    setOpen(false);
  };

  return (
    <header className="lp-top" data-scrolled={scrolled} data-open={open}>
      <div className="lp-top-in">
        <a className="lp-brand" href="#top" aria-label="Builderset, back to the top">
          <Logo size={26} />
          <span>Builderset</span>
          <small>{version}</small>
        </a>
        <nav className="lp-links" aria-label="On this page">
          {SECTIONS.map((section) => (
            <a key={section.href} href={section.href}>
              {section.label}
            </a>
          ))}
          <a href={docs}>Docs</a>
        </nav>
        <div className="lp-top-right">
          <a className="lp-iconbtn lp-hide-sm" href={github} aria-label="Builderset on GitHub">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="gh">
              <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
            </svg>
          </a>
          <ThemeToggle />
          <a className="lp-button sm lp-hide-sm" href={start}>
            Get started <ArrowRight className="arrow" size={15} />
          </a>
          <button
            type="button"
            className="lp-iconbtn lp-menu"
            aria-label={open ? 'Close the menu' : 'Open the menu'}
            aria-expanded={open}
            aria-controls="lp-sheet"
            onClick={() => {
              setOpen((current) => !current);
            }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <div className="lp-sheet" id="lp-sheet" hidden={!open}>
        {SECTIONS.map((section) => (
          <a key={section.href} href={section.href} onClick={close}>
            {section.label}
          </a>
        ))}
        <a href={docs} onClick={close}>
          Docs
        </a>
        <a href={github} onClick={close}>
          GitHub
        </a>
        <a className="lp-button" href={start} onClick={close}>
          Get started <ArrowRight className="arrow" size={16} />
        </a>
      </div>
    </header>
  );
}
