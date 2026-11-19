import { ArrowRight, Blocks, Database, Languages } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { Code } from '@/components/code';
import { LiveEditorFrame } from '@/components/live-editor-frame';
import { Logo } from '@/components/logo';

import { LINKS } from './links';

const FACTS: { icon: ReactNode; tint: string; title: string; text: string }[] = [
  {
    icon: <Blocks size={20} />,
    tint: 'var(--bs-block-1)',
    title: 'One engine for every kind of content',
    text: 'Emails and articles today, on the same workspace: drag and drop, undo, an inspector, saved sections, several languages in one document. Each new kit gets all of it.',
  },
  {
    icon: <Languages size={20} />,
    tint: 'var(--bs-block-2)',
    title: 'Takes your theme and your language',
    text: 'A small set of CSS variables, or your shadcn tokens in one import. Light and dark. The editor speaks English, Albanian and German, and your writers write in as many languages as you publish.',
  },
  {
    icon: <Database size={20} />,
    tint: 'var(--bs-block-3)',
    title: 'Your database, your API',
    text: 'No iframe, no hosted account. Documents are typed JSON you store where you like; the editor calls your routes, and your server checks and renders them â€” in Node or in Python.',
  },
];

const KITS: { name: string; what: string; available: boolean }[] = [
  {
    name: '@builderset/email',
    what: 'Transactional and marketing email: the editor, and HTML that Gmail and Outlook show as designed.',
    available: true,
  },
  {
    name: '@builderset/article',
    what: 'Blog posts, help pages, any long-form content: the editor, and a renderer for your site.',
    available: true,
  },
  {
    name: 'builderset (Python)',
    what: 'The same checks and the same email HTML, on a Python server.',
    available: true,
  },
  { name: 'Popups', what: 'Banners and dialogs for your site.', available: false },
  { name: 'Pages', what: 'Landing pages, built from your own sections.', available: false },
];

export default function Page() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <a href="/" className="bs-brand inline-flex items-center gap-2.5" aria-label="Builderset">
          <Logo />
          <span className="text-[16px] font-semibold tracking-tight">Builderset</span>
        </a>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <a className="bs-muted hover:text-current" href={LINKS.docs}>
            Docs
          </a>
          <a className="bs-muted hidden hover:text-current sm:inline" href={LINKS.playground}>
            Playground
          </a>
          <a className="bs-muted hover:text-current" href={LINKS.github}>
            GitHub
          </a>
        </nav>
      </header>

      <main>
        {/* 1. What it is, in one sentence. */}
        <section className="mx-auto max-w-4xl px-4 pt-12 pb-12 text-center sm:px-6 sm:pt-20">
          <p className="bs-eyebrow bs-in">Visual editors, your stack</p>
          <h1 className="bs-title bs-in mt-4" style={{ '--i': 1 } as CSSProperties}>
            Let your users design emails and articles â€”{' '}
            <span className="bs-gradient">inside your own app.</span>
          </h1>
          <p className="bs-lead bs-in mx-auto mt-6 max-w-2xl" style={{ '--i': 2 } as CSSProperties}>
            Builderset is the editor, the renderer and the checker, as React components and a server
            library. You bring the theme, the language and the database.
          </p>
          <div
            className="bs-in mt-9 flex flex-wrap justify-center gap-3"
            style={{ '--i': 3 } as CSSProperties}
          >
            <a className="bs-button" href={LINKS.quickStart}>
              Get started <ArrowRight className="arrow" size={17} />
            </a>
            <a className="bs-button ghost" href={LINKS.playground}>
              Open the playground
            </a>
          </div>
        </section>

        {/* 2. A live editor, not a screenshot. */}
        <section
          className="bs-in-fade mx-auto max-w-6xl px-4 sm:px-6"
          aria-label="The email editor, live"
        >
          <LiveEditorFrame playground={LINKS.playground} />
          <p className="bs-muted mt-4 hidden text-center text-sm md:block">
            The real email editor, running in this page. Nothing you do here is saved.
          </p>
        </section>

        {/* 3. Three facts. */}
        <section className="mx-auto grid max-w-6xl gap-5 px-4 pt-24 sm:px-6 md:grid-cols-3">
          {FACTS.map((fact) => (
            <article key={fact.title} className="bs-card bs-reveal p-6">
              <span className="bs-tile" style={{ '--tint': fact.tint } as CSSProperties}>
                {fact.icon}
              </span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">{fact.title}</h2>
              <p className="bs-muted mt-2 text-[15px] leading-relaxed">{fact.text}</p>
            </article>
          ))}
        </section>

        {/* 4. Install, and the example. */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-4 pt-28 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="bs-reveal">
            <p className="bs-eyebrow">Two minutes to an editor</p>
            <h2 className="bs-h2 mt-3">Install one kit. Place one component.</h2>
            <p className="bs-lead mt-4 text-base">
              The editor saves through a small adapter to the routes you already have. On your
              server, the same package checks every save and renders the email to send.
            </p>
            <div className="mt-6">
              <Code path="../docs/snippets/install-email.sh" lang="bash" />
            </div>
            <p className="mt-6 text-[15px]">
              <a className="bs-link font-semibold" href={LINKS.quickStart}>
                The ten-minute quick start â†’
              </a>
            </p>
          </div>
          <div className="bs-reveal">
            <Code
              path="snippets/example.tsx"
              region="example"
              lang="tsx"
              title="email-editor.tsx"
            />
          </div>
        </section>

        {/* 5. The kits, and their state. */}
        <section className="mx-auto max-w-6xl px-4 pt-28 sm:px-6">
          <div className="bs-reveal max-w-2xl">
            <p className="bs-eyebrow">The kits</p>
            <h2 className="bs-h2 mt-3">One engine, one kit per kind of content.</h2>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {KITS.map((kit) => (
              <li key={kit.name} className="bs-card bs-reveal flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <code className="font-mono text-[14px] font-semibold">{kit.name}</code>
                  <span className={kit.available ? 'bs-badge on' : 'bs-badge'}>
                    {kit.available ? 'Available' : 'Coming'}
                  </span>
                </div>
                <p className="bs-muted text-[14.5px] leading-relaxed">{kit.what}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Links. */}
        <section className="mx-auto max-w-6xl px-4 pt-28 pb-24 sm:px-6">
          <div className="bs-card bs-reveal flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
            <div>
              <h2 className="bs-h2">Read the docs, or just try it.</h2>
              <p className="bs-muted mt-2">
                MIT licensed. React 19, Node 20 or newer, Python 3.11 or newer.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="bs-button" href={LINKS.docs}>
                Documentation <ArrowRight className="arrow" size={17} />
              </a>
              <a className="bs-button ghost" href={LINKS.github}>
                GitHub
              </a>
              <a className="bs-button ghost" href={LINKS.npm}>
                npm
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-[var(--bs-border)] px-4 py-8 text-sm sm:px-6">
        <span className="bs-brand inline-flex items-center gap-2">
          <Logo size={20} />
          <span className="bs-muted">Builderset</span>
        </span>
        <span className="bs-muted">MIT licence</span>
      </footer>
    </>
  );
}
