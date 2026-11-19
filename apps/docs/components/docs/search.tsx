'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Icon } from './icons';

interface Result {
  id: string;
  url: string;
  type: 'page' | 'heading' | 'text';
  content: string;
  breadcrumbs?: string[];
}

/** Shown before anything is typed. */
const START: Result[] = [
  { id: 's1', url: '/docs/quick-start/email', type: 'page', content: 'Quick start: email' },
  { id: 's2', url: '/docs/quick-start/article', type: 'page', content: 'Quick start: article' },
  { id: 's3', url: '/docs/guides/theme', type: 'page', content: 'Theme' },
  { id: 's4', url: '/docs/guides/backend', type: 'page', content: 'Backend setup' },
  { id: 's5', url: '/docs/reference/props', type: 'page', content: 'Props' },
];

/** A table row comes back as Markdown (`| a | b |`): show its cells instead. */
function readable(result: Result): Result {
  let content = result.content;
  if (content.trimStart().startsWith('|')) {
    const rows = content.split('\n').filter((row) => !/^\s*\|?\s*:?-{3,}/.test(row));
    content = (rows[rows.length - 1] ?? '')
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join(' · ');
  }
  // Markdown marks read as noise in a one-line result.
  content = content.replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  return { ...result, content };
}

/** The search box in the top bar, and the palette it opens (also on "/" and Ctrl K or ⌘K). */
export function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>(START);
  const [loading, setLoading] = useState(false);
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName);
      if (
        (event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(START);
      setAt(0);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?query=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<Result[]>)
        .then((found) => {
          setResults(found.slice(0, 40).map(readable));
          setAt(0);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const go = (result: Result | undefined) => {
    if (!result) return;
    close();
    router.push(result.url);
  };

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [at]);

  const pageOf = useMemo(() => {
    const titles = new Map<string, string>();
    for (const result of results) {
      if (result.type === 'page') titles.set(result.url.split('#')[0]!, result.content);
    }
    return (url: string) => titles.get(url.split('#')[0]!) ?? null;
  }, [results]);

  return (
    <>
      <button
        type="button"
        className="bs-search-btn"
        onClick={() => {
          setOpen(true);
        }}
        aria-label="Search the docs"
      >
        <Icon name="search" />
        <span>Search the docs</span>
        <kbd>/</kbd>
      </button>
      {open ? (
        <div
          className="bs-dialog"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="bs-palette" role="dialog" aria-modal="true" aria-label="Search the docs">
            <label className="bs-palette-in">
              <Icon name="search" />
              <input
                ref={input}
                id="bs-search"
                type="search"
                value={query}
                placeholder="Search guides, components, props, issue codes…"
                autoComplete="off"
                spellCheck={false}
                aria-controls="bs-search-results"
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') close();
                  else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setAt((i) => Math.min(results.length - 1, i + 1));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setAt((i) => Math.max(0, i - 1));
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    go(results[at]);
                  }
                }}
              />
              <kbd>Esc</kbd>
            </label>
            <div className="bs-results" id="bs-search-results" role="listbox" ref={list}>
              {!query.trim() ? <h5>Start here</h5> : null}
              {results.length === 0 ? (
                <p className="bs-palette-empty">
                  {loading
                    ? 'Searching…'
                    : `Nothing matches “${query.trim()}”. Try a component or prop name.`}
                </p>
              ) : (
                results.map((result, index) => (
                  <a
                    key={result.id}
                    href={result.url}
                    role="option"
                    aria-selected={index === at}
                    className={result.type === 'page' ? 'bs-result' : 'bs-result sub'}
                    onMouseMove={() => {
                      setAt(index);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      go(result);
                    }}
                  >
                    <span className="k">
                      <Icon
                        name={
                          result.type === 'page'
                            ? 'page'
                            : result.type === 'heading'
                              ? 'heading'
                              : 'text'
                        }
                      />
                    </span>
                    <span className="t">
                      {result.content}
                      {result.type !== 'page' && pageOf(result.url) ? (
                        <small>{pageOf(result.url)}</small>
                      ) : null}
                    </span>
                  </a>
                ))
              )}
            </div>
            <div className="bs-palette-foot">
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> to move
              </span>
              <span>
                <kbd>Enter</kbd> to open
              </span>
              <span>
                <kbd>Esc</kbd> to close
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
