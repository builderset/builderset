'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Logo } from '@/components/logo';
import type { NavFolder, NavGroup, NavPage } from '@/lib/nav';

import { Icon } from './icons';
import { Search } from './search';
import { pageHeadings, useReading, type Reading } from './spy';
import { ThemeToggle } from './theme';

const FOLDED = 'bs-docs-folded';
const narrow = () => window.matchMedia('(max-width: 900px)').matches;

/** The top bar, the sidebar and the drawer around every docs page. */
export function DocsShell({
  groups,
  version,
  github,
  children,
}: {
  groups: NavGroup[];
  version: string;
  github: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  // The top bar lifts off the page once it scrolls.
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 4);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(FOLDED) === '1' && !narrow()) {
        document.body.classList.add('bs-folded');
        setExpanded(false);
      }
    } catch {
      // No storage: the sidebar starts open.
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') document.body.classList.remove('bs-open');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // A link in the drawer closes it.
  useEffect(() => {
    document.body.classList.remove('bs-open');
  }, [pathname]);

  const toggle = () => {
    const body = document.body;
    if (narrow()) {
      const open = !body.classList.contains('bs-open');
      body.classList.toggle('bs-open', open);
      setExpanded(open);
      return;
    }
    const folded = !body.classList.contains('bs-folded');
    body.classList.toggle('bs-folded', folded);
    setExpanded(!folded);
    try {
      localStorage.setItem(FOLDED, folded ? '1' : '0');
    } catch {
      // The choice lasts for this page only.
    }
  };

  return (
    <>
      <header className="bs-top" data-scrolled={scrolled}>
        <div className="bs-top-in">
          <div className="bs-top-left">
            <Link className="bs-brand" href="/docs">
              <Logo size={26} />
              <span className="name">Builderset</span>
              <small>Docs</small>
            </Link>
            <span className="bs-version" title={`These pages describe Builderset ${version}`}>
              {version}
            </span>
            <button
              type="button"
              className="bs-iconbtn bs-fold"
              aria-label="Show or hide the navigation"
              aria-expanded={expanded}
              onClick={toggle}
            >
              <Icon name="panel" />
            </button>
          </div>
          <Search />
          <div className="bs-top-right">
            <Link className="bs-button ghost bs-hide-sm" href="/playground">
              Playground
            </Link>
            <a
              className="bs-iconbtn"
              href={github}
              aria-label="Builderset on GitHub"
              title="GitHub"
            >
              <Icon name="github" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div
        className="bs-scrim"
        onClick={() => {
          document.body.classList.remove('bs-open');
          setExpanded(false);
        }}
      />
      <div className="bs-shell">
        <aside className="bs-side" aria-label="Documentation">
          <Sidebar groups={groups} pathname={pathname} />
        </aside>
        {children}
      </div>
    </>
  );
}

const GROUP_ICON = { start: 'start', guides: 'guides', reference: 'reference' } as const;

function Sidebar({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const reading = useReading(pathname);
  const side = useRef<HTMLElement | null>(null);

  // Bring the current page into view in a long sidebar.
  useEffect(() => {
    const current = document.querySelector<HTMLElement>('.bs-nav [aria-current="page"]');
    const box = document.querySelector<HTMLElement>('.bs-nav');
    side.current = box;
    if (!current || !box) return;
    const c = current.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (c.top < b.top || c.bottom > b.bottom - 120) {
      box.scrollTo({ top: box.scrollTop + c.top - b.top - 120, behavior: 'smooth' });
    }
  }, [pathname]);

  const contains = (group: NavGroup) =>
    group.items.some((item) =>
      item.kind === 'page'
        ? item.url === pathname
        : item.url === pathname || item.pages.some((page) => page.url === pathname),
    );

  return (
    <>
      <nav className="bs-nav">
        {groups.map((group) => {
          const open = !closed[group.name];
          return (
            <div
              key={group.name}
              className={contains(group) ? 'bs-group has-current' : 'bs-group'}
              data-open={open}
            >
              <button
                type="button"
                className="bs-group-h"
                aria-expanded={open}
                onClick={() => {
                  setClosed((current) => ({ ...current, [group.name]: open }));
                }}
              >
                <span className="ico">
                  <Icon name={GROUP_ICON[group.icon]} />
                </span>
                <span className="lbl">{group.name}</span>
                <Icon name="chevron" className="chev" />
              </button>
              <div className="bs-collapse">
                <div>
                  {group.items.map((item) =>
                    item.kind === 'page' ? (
                      <Item key={item.url} page={item} pathname={pathname} reading={reading} />
                    ) : (
                      <Folder key={item.name} folder={item} pathname={pathname} reading={reading} />
                    ),
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      {/* Stays at the foot of the sidebar while the list above it scrolls. */}
      <div className="bs-side-foot">
        <Link href="/playground">
          <Icon name="play" />
          Playground
        </Link>
        <a href="https://builderset.vercel.app">
          <Icon name="external" />
          builderset.vercel.app
        </a>
      </div>
    </>
  );
}

function Folder({
  folder,
  pathname,
  reading,
}: {
  folder: NavFolder;
  pathname: string;
  reading: Reading;
}) {
  return (
    <div className="bs-folder">
      {folder.url ? (
        <Item
          page={{ kind: 'page', name: folder.name, url: folder.url }}
          pathname={pathname}
          reading={reading}
        />
      ) : (
        <div className="bs-folder-name">{folder.name}</div>
      )}
      {folder.pages.map((page) => (
        <Item key={page.url} page={page} pathname={pathname} reading={reading} />
      ))}
    </div>
  );
}

/** A page; the current one gets a reading ring, and its sections underneath. */
function Item({ page, pathname, reading }: { page: NavPage; pathname: string; reading: Reading }) {
  const here = page.url === pathname;
  return (
    <>
      <Link className="bs-item" href={page.url} aria-current={here ? 'page' : undefined}>
        <span>{page.name}</span>
        {here ? <Ring progress={reading.progress} /> : null}
      </Link>
      {here ? <Sections pathname={pathname} reading={reading} /> : null}
    </>
  );
}

function Ring({ progress }: { progress: number }) {
  return (
    <svg className="bs-ring" viewBox="0 0 20 20" aria-hidden="true">
      <circle className="t" cx="10" cy="10" r="7" />
      <circle
        className="p"
        cx="10"
        cy="10"
        r="7"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - Math.round(progress * 100)}
      />
    </svg>
  );
}

function Sections({ pathname, reading }: { pathname: string; reading: Reading }) {
  const [sections, setSections] = useState<{ id: string; label: string }[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState(0);

  const [deep, setDeep] = useState(false);

  useEffect(() => {
    // A page of numbered steps has its sections one level down.
    const h2 = pageHeadings('h2[id]');
    const both = h2.length < 3;
    setDeep(both);
    setSections(
      (both ? pageHeadings() : h2).map((heading) => ({
        id: heading.id,
        label: (heading.textContent ?? '').replace(/#\s*$/, '').trim(),
      })),
    );
  }, [pathname]);

  const at = sections.findIndex(
    (section) => section.id === (deep ? reading.active : reading.section),
  );

  useEffect(() => {
    const link = box.current?.querySelectorAll<HTMLElement>('a')[at];
    setFill(link ? link.offsetTop + link.offsetHeight / 2 : 0);
  }, [at, sections]);

  if (!sections.length) return null;
  return (
    <div className="bs-sub" ref={box}>
      <span className="bs-sub-fill" style={{ height: fill }} />
      {sections.map((section, index) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={index === at ? 'is-active' : index < at ? 'is-passed' : undefined}
        >
          <i />
          {section.label}
        </a>
      ))}
    </div>
  );
}
