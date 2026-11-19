'use client';

import '@builderset/email/styles.css';
import '@builderset/article/styles.css';
import '@builderset/article/content.css';

import {
  createArticleRegistry,
  kitchenSinkDocument,
  parseArticle,
  type ArticleDocument,
} from '@builderset/article';
import { ArticleEditor } from '@builderset/article/editor';
import { createMemoryHost as articleMemoryHost } from '@builderset/article/host';
import { de as articleDe } from '@builderset/article/locales/de';
import { sq as articleSq } from '@builderset/article/locales/sq';
import { ArticleRenderer } from '@builderset/article/render';
import emptyArticle from '@builderset/article/fixtures/valid/empty.json';
import {
  createEmailRegistry,
  kitchenSinkEmail,
  parseEmail,
  starterEmail,
  type EmailDocument,
} from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import { createMemoryHost as emailMemoryHost } from '@builderset/email/host';
import { de as emailDe } from '@builderset/email/locales/de';
import { sq as emailSq } from '@builderset/email/locales/sq';
import { DEFAULT_BRAND, renderEmail } from '@builderset/email/render';
import emptyEmail from '@builderset/email/fixtures/valid/empty.json';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  cssFor,
  EDITOR_LANGUAGES,
  FONTS,
  forgetDocument,
  jsxFor,
  readDocument,
  readSettings,
  SEVERAL_CONTENT_LANGUAGES,
  TEMPLATES,
  tokensOf,
  writeDocument,
  writeSettings,
  type Kit,
  type Settings,
} from './settings';

const emailRegistry = createEmailRegistry();
const articleRegistry = createArticleRegistry();

/** A template's document, or the one this browser kept from last time. */
function startingEmail(template: string): EmailDocument {
  const kept = parseEmail(readDocument('email', template), emailRegistry);
  if (kept) return kept;
  if (template === 'kitchen-sink') return kitchenSinkEmail(emailRegistry);
  if (template === 'empty') return parseEmail(emptyEmail, emailRegistry) as EmailDocument;
  return starterEmail(emailRegistry, { name: 'Welcome', subject: 'Welcome aboard' });
}

function startingArticle(template: string): ArticleDocument {
  const kept = parseArticle(readDocument('article', template), articleRegistry);
  if (kept.ok && kept.doc) return kept.doc;
  if (template === 'empty')
    return parseArticle(emptyArticle, articleRegistry).doc as ArticleDocument;
  return kitchenSinkDocument(articleRegistry);
}

/** A picture this tab uploaded, or the site's sample for the templates' made-up keys. */
function withSampleMedia<THost extends { resolveMedia: (key: string) => string }>(
  host: THost,
): THost {
  return {
    ...host,
    resolveMedia: (key: string) => {
      const url = host.resolveMedia(key);
      return url === key ? '/sample.png' : url;
    },
  };
}

const RECORD: { status: string; scheduledAt: string | null; publishedAt: string | null } = {
  status: 'draft',
  scheduledAt: null,
  publishedAt: null,
};
const SAMPLE_DATA = { recipient: { name: 'Ana', email: 'ana@example.com' } };

export function Playground() {
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [generation, setGeneration] = useState(0);
  const [articleRecord, setArticleRecord] = useState({
    ...RECORD,
    slug: 'my-article',
    locale: 'en',
  });
  const [copied, setCopied] = useState<string | null>(null);
  const set = (patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };
  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  const { kit } = settings;
  const template = settings.template[kit];
  const contentLocales = settings.severalContentLanguages ? SEVERAL_CONTENT_LANGUAGES : ['en'];
  // A new editor when the starting document or its languages change.
  const editorKey = `${kit}:${template}:${String(generation)}:${contentLocales.join(',')}`;

  const [email, setEmail] = useState<EmailDocument>(() => startingEmail(settings.template.email));
  const [article, setArticle] = useState<ArticleDocument>(() =>
    startingArticle(settings.template.article),
  );
  // Made once per editor: the document it starts from, and every save kept here.
  const hosts = useMemo(() => {
    const emailStart = startingEmail(settings.template.email);
    const articleStart = startingArticle(settings.template.article);
    return {
      emailStart,
      articleStart,
      email: withSampleMedia(
        emailMemoryHost<EmailDocument>({
          document: emailStart,
          onSave: (document) => {
            setEmail(document);
            writeDocument('email', settings.template.email, document);
          },
        }),
      ),
      article: withSampleMedia(
        articleMemoryHost<ArticleDocument>({
          document: articleStart,
          onSave: (document) => {
            setArticle(document);
            writeDocument('article', settings.template.article, document);
          },
        }),
      ),
    };
    // Once per editorKey: the templates it names are part of it.
  }, [editorKey]);
  // The output shows a new editor's starting document until its first save.
  useEffect(() => {
    setEmail(hosts.emailStart);
    setArticle(hosts.articleStart);
  }, [hosts]);

  const tokens = tokensOf(settings);
  const common = {
    theme: settings.theme,
    tokens,
    locale: settings.language,
    contentLocales,
    defaultContentLocale: 'en',
    // The editor fills its root; the root is as tall as the space it is given.
    className: 'h-full',
    onBack: () => {
      window.scrollTo({ top: 0 });
    },
  };
  const editor: ReactNode =
    kit === 'email' ? (
      <EmailEditor
        key={editorKey}
        {...common}
        document={hosts.emailStart}
        registry={emailRegistry}
        host={hosts.email}
        type={null}
        brand={DEFAULT_BRAND}
        record={RECORD}
        locales={{ sq: emailSq, de: emailDe }}
        storageKey={`builderset-playground:recovery:email:${template}`}
      />
    ) : (
      <ArticleEditor
        key={editorKey}
        {...common}
        document={hosts.articleStart}
        host={hosts.article}
        record={articleRecord}
        onRecordChange={(patch) => {
          setArticleRecord((current) => ({ ...current, ...patch }));
        }}
        locales={{ sq: articleSq, de: articleDe }}
        storageKey={`builderset-playground:recovery:article:${template}`}
      />
    );

  const copy = async (what: 'JSX' | 'CSS') => {
    try {
      await navigator.clipboard.writeText(what === 'JSX' ? jsxFor(settings) : cssFor(settings));
      setCopied(what);
      setTimeout(() => {
        setCopied(null);
      }, 1500);
    } catch {
      setCopied('Copy is blocked here');
    }
  };
  const reset = () => {
    forgetDocument(kit, template);
    setGeneration((value) => value + 1);
  };

  return (
    <div className="flex h-dvh flex-col">
      <Controls settings={settings} set={set} onCopy={copy} copied={copied} onReset={reset} />
      <div className="flex min-h-0 flex-1">
        <div
          // `theme="auto"` follows the nearest element marked dark or light. The
          // editor fills the window (position: fixed); `contain: layout` makes this
          // box the one it fills, beside the controls and the output.
          className={`relative min-w-0 flex-1 [contain:layout] ${settings.pageDark ? 'dark' : 'light'}`}
          data-playground-editor=""
        >
          {editor}
        </div>
        {settings.showOutput ? (
          <Output
            kit={kit}
            email={email}
            article={article}
            settings={settings}
            set={set}
            resolveMedia={(kit === 'email' ? hosts.email : hosts.article).resolveMedia}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── the controls ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-fd-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const input =
  'h-8 rounded-md border bg-fd-background px-2 text-sm text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-primary';
const button =
  'h-8 rounded-md border bg-fd-secondary px-3 text-sm text-fd-secondary-foreground hover:bg-fd-accent';

function Controls({
  settings,
  set,
  onCopy,
  copied,
  onReset,
}: {
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
  onCopy: (what: 'JSX' | 'CSS') => Promise<void>;
  copied: string | null;
  onReset: () => void;
}) {
  const { kit } = settings;
  return (
    <div className="flex flex-wrap items-end gap-3 border-b bg-fd-card px-4 py-3">
      <Field label="Kit">
        <select
          className={input}
          value={kit}
          onChange={(event) => {
            set({ kit: event.target.value as Kit });
          }}
        >
          <option value="email">Email</option>
          <option value="article">Article</option>
        </select>
      </Field>
      <Field label="Template">
        <select
          className={input}
          value={settings.template[kit]}
          onChange={(event) => {
            set({ template: { ...settings.template, [kit]: event.target.value } });
          }}
        >
          {TEMPLATES[kit].map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Theme">
        <select
          className={input}
          value={settings.theme}
          onChange={(event) => {
            set({ theme: event.target.value as Settings['theme'] });
          }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto — follows the page</option>
        </select>
      </Field>
      <label className="flex h-8 items-center gap-2 self-end text-sm">
        <input
          type="checkbox"
          checked={settings.pageDark}
          onChange={(event) => {
            set({ pageDark: event.target.checked });
          }}
        />
        Page is dark
      </label>
      <Field label="Brand colour">
        <span className="flex items-center gap-1">
          <input
            type="color"
            className="h-8 w-10 cursor-pointer rounded-md border bg-fd-background"
            value={settings.primary || '#2563eb'}
            onChange={(event) => {
              set({ primary: event.target.value });
            }}
          />
          {settings.primary ? (
            <button
              type="button"
              className="text-xs underline"
              onClick={() => {
                set({ primary: '' });
              }}
            >
              clear
            </button>
          ) : null}
        </span>
      </Field>
      <Field label="Radius">
        <select
          className={input}
          value={settings.radius}
          onChange={(event) => {
            set({ radius: event.target.value });
          }}
        >
          <option value="">The editor’s own</option>
          <option value="0rem">Square</option>
          <option value="0.375rem">Small</option>
          <option value="1rem">Large</option>
        </select>
      </Field>
      <Field label="Font">
        <select
          className={input}
          value={settings.font}
          onChange={(event) => {
            set({ font: event.target.value });
          }}
        >
          {FONTS.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Editor language">
        <select
          className={input}
          value={settings.language}
          onChange={(event) => {
            set({ language: event.target.value as Settings['language'] });
          }}
        >
          {EDITOR_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Content languages">
        <select
          className={input}
          value={settings.severalContentLanguages ? 'several' : 'one'}
          onChange={(event) => {
            set({ severalContentLanguages: event.target.value === 'several' });
          }}
        >
          <option value="one">One (English)</option>
          <option value="several">Several (English, German, French)</option>
        </select>
      </Field>
      <div className="ml-auto flex items-end gap-2">
        <button
          type="button"
          className={button}
          onClick={() => {
            void onCopy('JSX');
          }}
        >
          {copied === 'JSX' ? 'Copied' : 'Copy JSX'}
        </button>
        <button
          type="button"
          className={button}
          onClick={() => {
            void onCopy('CSS');
          }}
        >
          {copied === 'CSS' ? 'Copied' : 'Copy CSS'}
        </button>
        <button type="button" className={button} onClick={onReset}>
          Reset
        </button>
        <button
          type="button"
          className={button}
          aria-pressed={settings.showOutput}
          onClick={() => {
            set({ showOutput: !settings.showOutput });
          }}
        >
          {settings.showOutput ? 'Hide output' : 'Show output'}
        </button>
      </div>
      <p className="w-full text-xs text-fd-muted-foreground">
        Everything stays in this browser: the document is kept between visits, and pictures you
        upload live only in this tab.
        {copied && copied !== 'JSX' && copied !== 'CSS' ? ` ${copied}.` : ''}
      </p>
    </div>
  );
}

// ── the output ────────────────────────────────────────────────────────────

function Output({
  kit,
  email,
  article,
  settings,
  set,
  resolveMedia,
}: {
  kit: Kit;
  email: EmailDocument;
  article: ArticleDocument;
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
  resolveMedia: (key: string) => string;
}) {
  const tabs = kit === 'email' ? (['json', 'html', 'text'] as const) : (['json', 'page'] as const);
  const active = (tabs as readonly string[]).includes(settings.output) ? settings.output : 'json';
  const rendered = useMemo(
    () =>
      kit === 'email'
        ? renderEmail(email, { assetUrl: resolveMedia, data: SAMPLE_DATA, locale: 'en' })
        : null,
    [kit, email, resolveMedia],
  );
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && settings.pageDark);
  const labels = {
    json: 'Document (JSON)',
    html: 'Email (HTML)',
    text: 'Plain text',
    page: 'Page',
  };
  return (
    <aside
      className="flex w-[440px] shrink-0 flex-col border-l bg-fd-card"
      data-playground-output=""
    >
      <div className="flex gap-1 border-b px-2 py-2" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active === tab}
            className={`rounded-md px-3 py-1 text-sm ${active === tab ? 'bg-fd-accent text-fd-accent-foreground' : 'text-fd-muted-foreground'}`}
            onClick={() => {
              set({ output: tab });
            }}
          >
            {labels[tab]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {active === 'json' ? (
          <pre className="p-3 text-xs">
            {JSON.stringify(kit === 'email' ? email : article, null, 2)}
          </pre>
        ) : null}
        {active === 'html' && rendered ? (
          <iframe
            title="The rendered email"
            sandbox=""
            srcDoc={rendered.html}
            className="h-full w-full bg-white"
          />
        ) : null}
        {active === 'text' && rendered ? (
          <pre className="whitespace-pre-wrap p-3 text-xs">{rendered.text}</pre>
        ) : null}
        {active === 'page' ? (
          // The page around the article, in the theme the article is shown in.
          <div className={`min-h-full p-4 ${dark ? 'dark bg-neutral-950' : 'light bg-white'}`}>
            <ArticleRenderer
              document={article}
              registry={articleRegistry}
              resolveMedia={resolveMedia}
              locale="en"
              theme={settings.theme}
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
