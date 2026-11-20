import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Database,
  MonitorSmartphone,
  ServerCog,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';

import { Code } from '@/components/code';
import { CopyButton } from '@/components/copy-button';
import { Features, type Feature } from '@/components/features';
import { HeroBuild } from '@/components/hero-build';
import { Horizon } from '@/components/horizon';
import { LiveDemo } from '@/components/live-demo';
import { Logo } from '@/components/logo';
import { Nav } from '@/components/nav';
import { Reveal } from '@/components/reveal';

import { editorWords, heroBlocks, issues, VERSION } from './data';
import { LINKS } from './links';

/** A button's label that rolls up to a copy of itself on hover. */
function Roll({ children }: { children: string }) {
  return (
    <span className="lp-roll" data-text={children}>
      <span>{children}</span>
    </span>
  );
}

const delay = (step: number) => ({ '--d': step }) as CSSProperties;

const INSTALL = 'npm install @builderset/email';

/** The way a save travels: from the editor, through your routes, to your table. */
const FLOW: { icon: LucideIcon; title: string; code: string; text: string }[] = [
  {
    icon: MonitorSmartphone,
    title: 'Your React app',
    code: '<EmailEditor host={host} />',
    text: 'The editor is a component on your own page. No iframe; your theme, your fonts.',
  },
  {
    icon: Braces,
    title: 'Your routes',
    code: 'PUT …/draft · POST …/publish',
    text: 'The host adapter calls the API you already have, or one you write by hand.',
  },
  {
    icon: ServerCog,
    title: 'Your server',
    code: 'checkEmail() · renderEmail()',
    text: 'Checks every save and renders the email to send. In Node, or in Python.',
  },
  {
    icon: Database,
    title: 'Your database',
    code: 'jsonb · typed JSON',
    text: 'A document is typed JSON with a schema. Store it in the table you like.',
  },
];

const KITS: {
  name: string;
  what: string;
  status: 'Available' | 'Coming';
  href?: string;
}[] = [
  {
    name: '@builderset/email',
    what: 'Transactional and marketing email: the editor, and HTML that Gmail and Outlook show as designed.',
    status: 'Available',
    href: LINKS.quickStart,
  },
  {
    name: '@builderset/article',
    what: 'Blog posts, help pages, any long-form content: the editor, and a renderer for your site.',
    status: 'Available',
    href: LINKS.quickStartArticle,
  },
  {
    name: 'builderset',
    what: 'For Python servers: the same checks and the same email HTML.',
    status: 'Available',
    href: LINKS.python,
  },
  { name: 'Popups', what: 'Banners and dialogs for your site.', status: 'Coming' },
  { name: 'Pages', what: 'Landing pages, built from your own sections.', status: 'Coming' },
];

export default function Page() {
  const words = editorWords();
  const refused = issues();

  const features: Feature[] = [
    {
      key: 'theme',
      label: 'Your theme',
      title: 'It looks like the rest of your app',
      text: 'A small set of CSS variables, or your shadcn tokens in one import. Light and dark.',
      link: { href: LINKS.theme, label: 'Theme guide' },
      demo: (
        <div className="lp-demo-theme">
          <Code path="../docs/snippets/guides/theme.css" lang="css" title="app.css" />
          <p className="lp-aside">
            Already on shadcn/ui? Import <code>@builderset/email/theme/shadcn.css</code> and the
            editor reads your <code>--primary</code>, <code>--radius</code> and the rest.
          </p>
        </div>
      ),
    },
    {
      key: 'language',
      label: 'Your languages',
      title: 'The editor speaks your writers’ language',
      text: 'English, Albanian and German built in. One document holds every language you publish.',
      link: { href: LINKS.language, label: 'Language guide' },
      demo: (
        <div className="lp-words">
          <div className="lp-words-table" role="table" aria-label="The editor's words">
            <div className="lp-words-row head" role="row">
              <span role="columnheader">message</span>
              {words.languages.map((language) => (
                <span key={language.code} role="columnheader">
                  {language.name}
                </span>
              ))}
            </div>
            {words.rows.map((row, index) => (
              <div
                key={row.key}
                className="lp-words-row"
                role="row"
                style={{ '--r': index } as CSSProperties}
              >
                <code role="cell">{row.key}</code>
                {row.words.map((text, column) => (
                  <span key={column} role="cell">
                    {text}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="lp-aside">
            Straight from <code>@builderset/email/locales</code>. Writers switch the language in the
            editor; the structure, images and links stay shared, and only the words change.
          </p>
        </div>
      ),
    },
    {
      key: 'checks',
      label: 'Checked on every save',
      title: 'A broken email never reaches the table',
      text: 'Your server checks each save against the schema and the rules, and answers with issue codes.',
      link: { href: LINKS.issues, label: 'Every issue code' },
      demo: (
        <div className="lp-check">
          <div className="lp-check-h">
            <span className="verb">PUT</span>
            <code>/api/emails/welcome/draft</code>
            <span className="lp-check-state">Refused · {refused.length} issues</span>
          </div>
          <ul>
            {refused.map((issue, index) => (
              <li key={issue.code} style={{ '--r': index } as CSSProperties}>
                <span className="x" aria-hidden="true" />
                <span className="t">{issue.text}</span>
                <code>{issue.code}</code>
              </li>
            ))}
          </ul>
          <p className="lp-aside">
            The editor shows the same list before anyone presses Activate, in the writer’s language.{' '}
            <code>checkEmail</code> in Node and <code>check_email</code> in Python give the same
            codes.
          </p>
        </div>
      ),
    },
    {
      key: 'render',
      label: 'Node or Python',
      title: 'Render on the server you already run',
      text: 'The same package renders the email to send. The Python one gives the same HTML.',
      link: { href: LINKS.python, label: 'Python reference' },
      demo: (
        <div className="lp-twin">
          <Code path="../docs/snippets/guides/send.ts" lines={[11, 19]} lang="ts" title="send.ts" />
          <Code
            path="../docs/snippets/python/send_email.py"
            lines={[15, 26]}
            lang="python"
            title="send_email.py"
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <Nav docs={LINKS.docs} github={LINKS.github} start={LINKS.quickStart} version={VERSION} />
      <Reveal />

      <main id="top">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-hero-sky" aria-hidden="true" />
          <div className="lp-wrap lp-hero-copy">
            <a className="lp-pill lp-rise" href={LINKS.docs} style={delay(0)}>
              <span className="dot" aria-hidden="true" />
              <span>
                <b>{VERSION}</b> · Email and article kits
              </span>
              <ArrowRight size={14} />
            </a>
            <h1 className="lp-h1">
              <span className="lp-rise" style={delay(1)}>
                Let your users design emails and articles,
              </span>{' '}
              <span className="lp-rise accent" style={delay(2)}>
                inside your own app.
              </span>
            </h1>
            <p className="lp-lead lp-rise" style={delay(3)}>
              Builderset is the editor, the renderer and the checker: React components and a server
              library. You bring the theme, the language and the database.
            </p>
            <div className="lp-actions center lp-rise" style={delay(4)}>
              <a className="lp-button light" href={LINKS.quickStart}>
                <Roll>Get started</Roll> <ArrowRight className="arrow" size={17} />
              </a>
              <a className="lp-button glass" href={LINKS.playground}>
                <Roll>Open the playground</Roll>
              </a>
            </div>
            <div className="lp-install lp-rise" style={delay(5)}>
              <span className="lp-install-p" aria-hidden="true">
                $
              </span>
              <code>{INSTALL}</code>
              <CopyButton text={INSTALL} />
            </div>
          </div>
          <Horizon>
            <HeroBuild blocks={heroBlocks()} />
          </Horizon>
        </section>

        <div className="lp-facts-band">
          <ul className="lp-wrap lp-facts">
            <li>
              <b>React 19</b> components
            </li>
            <li>
              <b>Node 20+</b> or <b>Python 3.11+</b> on the server
            </li>
            <li>
              <b>Your database</b>, no hosted account
            </li>
            <li>
              <b>MIT</b> licensed
            </li>
          </ul>
        </div>

        {/* ── The live editor ─────────────────────────────────────────────── */}
        <section className="lp-section tint" id="editor">
          <div className="lp-wrap">
            <header className="lp-head split" data-reveal>
              <div>
                <p className="lp-eyebrow">
                  <i aria-hidden="true" />
                  Live, in this page
                </p>
                <h2 className="lp-h2">This is the real editor, not a recording.</h2>
              </div>
              <p className="lp-sub">
                Drag a block, write a line, undo it. The switches below set the same props your code
                would. Nothing you do here is saved.
              </p>
            </header>
            <div className="lp-stage" data-reveal>
              <LiveDemo playground={LINKS.playground} />
            </div>
          </div>
        </section>

        {/* ── How it fits ─────────────────────────────────────────────────── */}
        <section className="lp-section" id="how">
          <div className="lp-wrap">
            <header className="lp-head" data-reveal>
              <p className="lp-eyebrow">
                <i aria-hidden="true" />
                How it fits
              </p>
              <h2 className="lp-h2">It lives in your app. Nothing lives with us.</h2>
              <p className="lp-sub">
                A save goes from the editor to your routes, is checked on your server, and lands in
                your table. Builderset is the code at each step, not a service between them.
              </p>
            </header>
            <ol className="lp-flow" data-reveal>
              {FLOW.map((step, index) => (
                <li key={step.title} className="lp-flow-step" style={delay(index)}>
                  <span className="lp-flow-icon">
                    <step.icon size={20} strokeWidth={1.8} />
                  </span>
                  <span className="lp-flow-n">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{step.title}</h3>
                  <code>{step.code}</code>
                  <p>{step.text}</p>
                  {index < FLOW.length - 1 ? (
                    <span className="lp-flow-wire" aria-hidden="true">
                      <i />
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className="lp-flow-note" data-reveal>
              <ShieldCheck size={17} strokeWidth={1.8} />
              No iframe, no hosted account, no tracking. Your documents never leave your servers.
            </p>
          </div>
        </section>

        {/* ── What every kit gets ─────────────────────────────────────────── */}
        <section className="lp-section tint" id="features">
          <div className="lp-wrap">
            <header className="lp-head" data-reveal>
              <p className="lp-eyebrow">
                <i aria-hidden="true" />
                One engine
              </p>
              <h2 className="lp-h2">What every kit gets.</h2>
              <p className="lp-sub">
                Drag and drop, undo, an inspector, saved sections and several languages in one
                document come from the shared engine. Each new kit starts with all of it.
              </p>
            </header>
            <div data-reveal>
              <Features features={features} />
            </div>
          </div>
        </section>

        {/* ── Get started ─────────────────────────────────────────────────── */}
        <section className="lp-section" id="start">
          <div className="lp-wrap lp-start">
            <header className="lp-head lp-start-head" data-reveal>
              <p className="lp-eyebrow">
                <i aria-hidden="true" />
                Get started
              </p>
              <h2 className="lp-h2">From install to the first save.</h2>
              <p className="lp-sub">
                Three steps, and the quick start walks through each in about ten minutes.
              </p>
              <a className="lp-button ghost" href={LINKS.quickStart}>
                The quick start <ArrowRight className="arrow" size={16} />
              </a>
            </header>
            <ol className="lp-steps">
              <li className="lp-step" data-reveal>
                <h3>Install one kit</h3>
                <p>React 19 on the page; the same package checks and renders on a Node server.</p>
                <Code path="../docs/snippets/install-email.sh" lang="bash" title="Terminal" />
              </li>
              <li className="lp-step" data-reveal>
                <h3>Place the editor</h3>
                <p>
                  One component, a registry of blocks, and a host: the small adapter that talks to
                  your routes.
                </p>
                <Code
                  path="snippets/example.tsx"
                  region="example"
                  lang="tsx"
                  title="email-editor.tsx"
                />
              </li>
              <li className="lp-step" data-reveal>
                <h3>Answer the saves</h3>
                <p>Three complete backends to copy from, each with its tests:</p>
                <div className="lp-rows">
                  <a href={LINKS.drizzle}>
                    <span>Next.js and Drizzle</span>
                    <code>TypeScript</code>
                    <ArrowUpRight size={16} />
                  </a>
                  <a href={LINKS.prisma}>
                    <span>Next.js and Prisma</span>
                    <code>TypeScript</code>
                    <ArrowUpRight size={16} />
                  </a>
                  <a href={LINKS.fastapi}>
                    <span>FastAPI and SQLAlchemy</span>
                    <code>Python</code>
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ── Kits ────────────────────────────────────────────────────────── */}
        <section className="lp-section tint" id="kits">
          <div className="lp-wrap">
            <header className="lp-head split" data-reveal>
              <div>
                <p className="lp-eyebrow">
                  <i aria-hidden="true" />
                  The kits
                </p>
                <h2 className="lp-h2">One engine, one kit per kind of content.</h2>
              </div>
              <p className="lp-sub">
                Each kit is an editor, a renderer and the checks for one kind of document. Install
                only the ones you use.
              </p>
            </header>
            <ul className="lp-kits" data-reveal>
              {KITS.map((kit, index) => {
                const inner = (
                  <>
                    <code className="name">{kit.name}</code>
                    <span className="what">{kit.what}</span>
                    <span className={kit.status === 'Available' ? 'lp-badge on' : 'lp-badge'}>
                      {kit.status}
                    </span>
                    {kit.href ? <ArrowUpRight className="go" size={17} /> : <span />}
                  </>
                );
                return (
                  <li key={kit.name} style={delay(index)}>
                    {kit.href ? (
                      <a className="lp-kit" href={kit.href}>
                        {inner}
                      </a>
                    ) : (
                      <div className="lp-kit soon">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── The way in ──────────────────────────────────────────────────── */}
        <section className="lp-end" aria-labelledby="lp-end-title">
          <div className="lp-end-grid" aria-hidden="true" />
          <div className="lp-wrap lp-end-in" data-reveal>
            <Logo size={64} className="lp-end-mark" />
            <h2 className="lp-h2" id="lp-end-title">
              Read the docs, or just try it.
            </h2>
            <p className="lp-sub">
              The playground runs both editors in your browser. The docs take you from install to
              going live.
            </p>
            <div className="lp-actions center">
              <a className="lp-button light" href={LINKS.docs}>
                <Roll>Read the docs</Roll> <ArrowRight className="arrow" size={17} />
              </a>
              <a className="lp-button glass" href={LINKS.playground}>
                <Roll>Open the playground</Roll>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <div className="lp-footer-brand">
            <a className="lp-brand" href="#top">
              <Logo size={24} />
              <span>Builderset</span>
            </a>
            <p>Visual editors for emails and articles, inside your own app.</p>
          </div>
          <nav aria-label="Docs">
            <h4>Docs</h4>
            <a href={LINKS.quickStart}>Quick start</a>
            <a href={LINKS.install}>Install</a>
            <a href={LINKS.backend}>Backend setup</a>
            <a href={LINKS.reference}>Reference</a>
          </nav>
          <nav aria-label="Project">
            <h4>Project</h4>
            <a href={LINKS.playground}>Playground</a>
            <a href={LINKS.github}>GitHub</a>
            <a href={LINKS.npm}>npm</a>
          </nav>
        </div>
        <div className="lp-wrap lp-footer-base">
          <span>MIT licence</span>
          <span className="mono">v{VERSION}</span>
        </div>
      </footer>
    </>
  );
}
