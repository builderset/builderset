'use client';

import '@builderset/email/styles.css';
import '@builderset/article/styles.css';
import '@builderset/form/styles.css';
import '@builderset/card/styles.css';
import '@builderset/popup/styles.css';

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
import { demoEmailType } from './demo-email-type';
import {
  createFormDocument,
  createFormRegistry,
  parseForm,
  type FormDocument,
} from '@builderset/form';
import { buildTemplateForm, FORM_TEMPLATES, FormEditor } from '@builderset/form/editor';
import { createMemoryHost as formMemoryHost } from '@builderset/form/host';
import { de as formDe } from '@builderset/form/locales/de';
import { sq as formSq } from '@builderset/form/locales/sq';
import { FormView } from '@builderset/form/render';
import {
  createCardDocument,
  createCardRegistry,
  EXAMPLE_MEMBERS,
  parseCard,
  printedFaces,
  type CardDocument,
} from '@builderset/card';
import { buildTemplateCard, CARD_TEMPLATES, CardEditor } from '@builderset/card/editor';
import { createMemoryHost as cardMemoryHost } from '@builderset/card/host';
import { de as cardDe } from '@builderset/card/locales/de';
import { sq as cardSq } from '@builderset/card/locales/sq';
import { CardView } from '@builderset/card/render';
import {
  createPopupDocument,
  createPopupRegistry,
  exampleData,
  formatOf as popupFormatOf,
  parsePopup,
  type PopupDocument,
} from '@builderset/popup';
import { buildTemplatePopup, POPUP_TEMPLATES, PopupEditor } from '@builderset/popup/editor';
import { createMemoryHost as popupMemoryHost } from '@builderset/popup/host';
import { de as popupDe } from '@builderset/popup/locales/de';
import { sq as popupSq } from '@builderset/popup/locales/sq';
import { memoryStore, PopupView } from '@builderset/popup/render';
import { themeVariables } from '@builderset/engine';
import {
  Badge,
  Button,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PortalProvider,
  SegmentedControl,
  Select,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipProvider,
} from '@builderset/engine/ui';
import {
  AppWindow,
  ArrowLeft,
  Check,
  Code2,
  ClipboardList,
  Copy,
  CreditCard,
  Mail,
  Newspaper,
  PanelRight,
  Paintbrush,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Logo } from '@/components/logo';

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
const formRegistry = createFormRegistry();
const cardRegistry = createCardRegistry();
const popupRegistry = createPopupRegistry();

/** A template's document, or the one this browser kept from last time. */
function startingEmail(template: string): EmailDocument {
  const kept = parseEmail(readDocument('email', template), emailRegistry);
  if (kept) return kept;
  if (template === 'kitchen-sink') return kitchenSinkEmail(emailRegistry);
  const empty = template === 'empty' ? parseEmail(emptyEmail, emailRegistry) : null;
  if (empty) return empty;
  return starterEmail(emailRegistry, { name: 'Welcome', subject: 'Welcome aboard' });
}

function startingArticle(template: string): ArticleDocument {
  const kept = parseArticle(readDocument('article', template), articleRegistry);
  if (kept.ok && kept.doc) return kept.doc;
  const empty = template === 'empty' ? parseArticle(emptyArticle, articleRegistry).doc : null;
  return empty ?? kitchenSinkDocument(articleRegistry);
}

function startingForm(template: string): FormDocument {
  const kept = parseForm(readDocument('form', template), formRegistry);
  if (kept) return kept;
  const chosen = FORM_TEMPLATES.find((candidate) => candidate.id === template);
  return chosen
    ? buildTemplateForm(formRegistry, chosen, { meta: { slug: chosen.id } })
    : createFormDocument({ name: 'New form', title: 'A new form', slug: 'new-form' });
}

function startingCard(template: string): CardDocument {
  const kept = parseCard(readDocument('card', template), cardRegistry);
  if (kept) return kept;
  const chosen = CARD_TEMPLATES.find((candidate) => candidate.id === template);
  return chosen
    ? buildTemplateCard(cardRegistry, chosen, { meta: { name: chosen.name.en } })
    : createCardDocument({ meta: { name: 'New card' } });
}

function startingPopup(template: string): PopupDocument {
  const kept = parsePopup(readDocument('popup', template), popupRegistry);
  if (kept) return kept;
  const chosen = POPUP_TEMPLATES.find((candidate) => candidate.id === template);
  return chosen
    ? buildTemplatePopup(popupRegistry, chosen, { meta: { name: chosen.name.en } })
    : createPopupDocument({ name: 'New popup' });
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

/** Brand colours to try, besides the editor's own and a picker. */
const BRAND_COLOURS = [
  { value: '#2a5bd7', label: 'Cobalt' },
  { value: '#da6c1e', label: 'Ember' },
  { value: '#1f7a4d', label: 'Pine' },
  { value: '#a3346b', label: 'Berry' },
  { value: '#111827', label: 'Ink' },
];

const RADII = [
  { value: '', label: 'Own' },
  { value: '0rem', label: 'Square' },
  { value: '0.375rem', label: 'Small' },
  { value: '1rem', label: 'Large' },
];

/**
 * The playground: both editors, with the props a project would pass set from
 * the bar above them. The bar and the output are drawn with the editor's own
 * UI kit (`@builderset/engine/ui`, shadcn on Radix) inside the same themed root,
 * so they ARE the builders' design — and take the same theme, brand colour,
 * radius and font as the editor beside them.
 */
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
  const [form, setForm] = useState<FormDocument>(() => startingForm(settings.template.form));
  const [card, setCard] = useState<CardDocument>(() => startingCard(settings.template.card));
  const [popup, setPopup] = useState<PopupDocument>(() => startingPopup(settings.template.popup));
  const [cardRecord, setCardRecord] = useState(RECORD);
  const [popupRecord, setPopupRecord] = useState(RECORD);
  // Made once per editor: the document it starts from, and every save kept here.
  const hosts = useMemo(() => {
    const emailStart = startingEmail(settings.template.email);
    const articleStart = startingArticle(settings.template.article);
    const formStart = startingForm(settings.template.form);
    const cardStart = startingCard(settings.template.card);
    const popupStart = startingPopup(settings.template.popup);
    return {
      emailStart,
      articleStart,
      formStart,
      cardStart,
      popupStart,
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
      form: withSampleMedia(
        formMemoryHost<FormDocument>({
          document: formStart,
          onSave: (document) => {
            setForm(document);
            writeDocument('form', settings.template.form, document);
          },
        }),
      ),
      card: withSampleMedia(
        cardMemoryHost<CardDocument>({
          document: cardStart,
          onSave: (document) => {
            setCard(document);
            writeDocument('card', settings.template.card, document);
          },
        }),
      ),
      popup: withSampleMedia(
        popupMemoryHost<PopupDocument>({
          document: popupStart,
          onSave: (document) => {
            setPopup(document);
            writeDocument('popup', settings.template.popup, document);
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
    setForm(hosts.formStart);
    setCard(hosts.cardStart);
    setPopup(hosts.popupStart);
  }, [hosts]);

  // One function per editor, so the rendered email is not redone on every render.
  const resolveMedia = useMemo(() => {
    const host = hosts[kit];
    return (key: string) => host.resolveMedia(key);
  }, [kit, hosts]);

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
      window.location.assign('/docs');
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
        type={demoEmailType}
        brand={DEFAULT_BRAND}
        // Nothing leaves the playground: the test is "sent" after a moment.
        onSendTest={() =>
          new Promise<boolean>((resolve) => {
            setTimeout(() => {
              resolve(true);
            }, 600);
          })
        }
        record={RECORD}
        locales={{ sq: emailSq, de: emailDe }}
        storageKey={`builderset-playground:recovery:email:${template}`}
      />
    ) : kit === 'form' ? (
      <FormEditor
        key={editorKey}
        {...common}
        document={hosts.formStart}
        registry={formRegistry}
        host={hosts.form}
        record={RECORD}
        locales={{ sq: formSq, de: formDe }}
        publicUrl={(slug) => `https://example.com/f/${slug}`}
        storageKey={`builderset-playground:recovery:form:${template}`}
      />
    ) : kit === 'card' ? (
      <CardEditor
        key={editorKey}
        {...common}
        document={hosts.cardStart}
        registry={cardRegistry}
        host={hosts.card}
        record={cardRecord}
        onRecordChange={(patch) => {
          setCardRecord((current) => ({ ...current, ...patch }));
        }}
        locales={{ sq: cardSq, de: cardDe }}
        memberCount={248}
        storageKey={`builderset-playground:recovery:card:${template}`}
      />
    ) : kit === 'popup' ? (
      <PopupEditor
        key={editorKey}
        {...common}
        document={hosts.popupStart}
        registry={popupRegistry}
        host={hosts.popup}
        record={popupRecord}
        onRecordChange={(patch) => {
          setPopupRecord((current) => ({ ...current, ...patch }));
        }}
        locales={{ sq: popupSq, de: popupDe }}
        colors={BRAND_COLOURS.map((colour) => ({ ...colour, hex: colour.value }))}
        storageKey={`builderset-playground:recovery:popup:${template}`}
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

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied('blocked');
    }
    setTimeout(() => {
      setCopied(null);
    }, 1600);
  };
  const reset = () => {
    forgetDocument(kit, template);
    setGeneration((value) => value + 1);
  };

  return (
    // `theme="auto"` follows the nearest element marked dark or light: this one.
    <div className={settings.pageDark ? 'dark' : 'light'}>
      <div
        className="builderset pg"
        data-builderset-theme={settings.theme}
        style={themeVariables(tokens)}
      >
        <PortalProvider>
          <TooltipProvider>
            <div className="pg-shell">
              <Bar settings={settings} set={set} copied={copied} onCopy={copy} onReset={reset} />
              <div className="pg-body">
                <div
                  // The editor fills the window (position: fixed); `contain: layout`
                  // makes this box the one it fills, beside the output.
                  className="pg-editor"
                  data-playground-editor=""
                >
                  {editor}
                </div>
                {settings.showOutput ? (
                  <Output
                    kit={kit}
                    email={email}
                    article={article}
                    form={form}
                    card={card}
                    popup={popup}
                    settings={settings}
                    set={set}
                    copied={copied}
                    onCopy={copy}
                    resolveMedia={resolveMedia}
                  />
                ) : null}
              </div>
            </div>
          </TooltipProvider>
        </PortalProvider>
      </div>
    </div>
  );
}

// ── the bar ───────────────────────────────────────────────────────────────

function Bar({
  settings,
  set,
  copied,
  onCopy,
  onReset,
}: {
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
  copied: string | null;
  onCopy: (what: string, text: string) => Promise<void>;
  onReset: () => void;
}) {
  const { kit } = settings;
  return (
    <header className="pg-bar">
      <div className="pg-bar-group">
        <Tooltip content="Back to the docs" side="bottom">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to the docs">
            <Link href="/docs">
              <ArrowLeft />
            </Link>
          </Button>
        </Tooltip>
        <Link href="/docs" className="pg-brand" aria-label="Builderset docs">
          <Logo size={22} />
          <span>Playground</span>
        </Link>
        <span className="pg-rule" aria-hidden="true" />
        <SegmentedControl
          aria-label="Kit"
          value={kit}
          onValueChange={(value) => {
            set({ kit: value });
          }}
          options={[
            {
              value: 'email',
              label: (
                <span className="pg-seg">
                  <Mail aria-hidden="true" />
                  Email
                </span>
              ),
            },
            {
              value: 'article',
              label: (
                <span className="pg-seg">
                  <Newspaper aria-hidden="true" />
                  Article
                </span>
              ),
            },
            {
              value: 'form',
              label: (
                <span className="pg-seg">
                  <ClipboardList aria-hidden="true" />
                  Form
                </span>
              ),
            },
            {
              value: 'card',
              label: (
                <span className="pg-seg">
                  <CreditCard aria-hidden="true" />
                  Card
                </span>
              ),
            },
            {
              value: 'popup',
              label: (
                <span className="pg-seg">
                  <AppWindow aria-hidden="true" />
                  Popup
                </span>
              ),
            },
          ]}
        />
        <Select
          aria-label="Template"
          className="pg-select"
          value={settings.template[kit]}
          onValueChange={(value) => {
            set({ template: { ...settings.template, [kit]: value } });
          }}
          options={TEMPLATES[kit].map((option) => ({ value: option.id, label: option.label }))}
        />
      </div>

      <div className="pg-bar-group end">
        <Select
          aria-label="The editor's language"
          className="pg-select narrow"
          value={settings.language}
          onValueChange={(value) => {
            set({ language: value as Settings['language'] });
          }}
          options={EDITOR_LANGUAGES.map((language) => ({
            value: language.code,
            label: language.label,
          }))}
        />
        <Customize settings={settings} set={set} />
        <Tooltip content="Start the template again" side="bottom">
          <Button variant="ghost" size="icon-sm" aria-label="Start again" onClick={onReset}>
            <RotateCcw />
          </Button>
        </Tooltip>
        <Tooltip
          content={settings.showOutput ? 'Hide the output' : 'Show the output'}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Output"
            aria-pressed={settings.showOutput}
            className={settings.showOutput ? 'pg-on' : undefined}
            onClick={() => {
              set({ showOutput: !settings.showOutput });
            }}
          >
            <PanelRight />
          </Button>
        </Tooltip>
        <span className="pg-rule" aria-hidden="true" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void onCopy('CSS', cssFor(settings));
          }}
        >
          {copied === 'CSS' ? <Check /> : <Paintbrush />}
          {copied === 'CSS' ? 'Copied' : 'Copy CSS'}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            void onCopy('JSX', jsxFor(settings));
          }}
        >
          {copied === 'JSX' ? <Check /> : <Code2 />}
          {copied === 'JSX' ? 'Copied' : 'Copy JSX'}
        </Button>
      </div>
    </header>
  );
}

/** The theme props, in one popover: what `theme` and `tokens` take. */
function Customize({
  settings,
  set,
}: {
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
}) {
  const custom = settings.primary && !BRAND_COLOURS.some((c) => c.value === settings.primary);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Theme and tokens">
          <span
            className="pg-dot"
            style={{
              background: settings.primary || 'var(--builderset-primary, var(--bst-d-primary))',
            }}
            aria-hidden="true"
          />
          Theme
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="pg-pop">
        <div className="pg-pop-h">
          <strong>Theme and tokens</strong>
          <span>The props your code passes.</span>
        </div>

        <div className="pg-field">
          <Label>theme</Label>
          <SegmentedControl
            aria-label="theme"
            value={settings.theme}
            onValueChange={(value) => {
              set({ theme: value });
            }}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto' },
            ]}
          />
        </div>

        <div className="pg-field row">
          <div>
            <Label htmlFor="pg-page-dark">The page is dark</Label>
            <p>What “Auto” follows.</p>
          </div>
          <Switch
            id="pg-page-dark"
            checked={settings.pageDark}
            onCheckedChange={(checked) => {
              set({ pageDark: checked });
            }}
          />
        </div>

        <div className="pg-field">
          <Label>tokens.primary</Label>
          <div className="pg-swatches">
            <button
              type="button"
              className="pg-swatch own"
              aria-pressed={!settings.primary}
              title="The editor’s own"
              aria-label="The editor’s own"
              onClick={() => {
                set({ primary: '' });
              }}
            />
            {BRAND_COLOURS.map((colour) => (
              <button
                key={colour.value}
                type="button"
                className="pg-swatch"
                aria-pressed={settings.primary === colour.value}
                title={`${colour.label} ${colour.value}`}
                aria-label={colour.label}
                style={{ background: colour.value }}
                onClick={() => {
                  set({ primary: colour.value });
                }}
              />
            ))}
            <label
              className="pg-swatch pick"
              title="Any colour"
              data-on={custom ? '' : undefined}
              style={custom ? { background: settings.primary } : undefined}
            >
              <input
                type="color"
                aria-label="Any colour"
                value={settings.primary || '#2563eb'}
                onChange={(event) => {
                  set({ primary: event.target.value });
                }}
              />
            </label>
          </div>
        </div>

        <div className="pg-field">
          <Label>tokens.radius</Label>
          <SegmentedControl
            aria-label="tokens.radius"
            value={settings.radius}
            onValueChange={(value) => {
              set({ radius: value });
            }}
            options={RADII}
          />
        </div>

        <div className="pg-field">
          <Label>tokens.font</Label>
          <Select
            aria-label="tokens.font"
            value={settings.font}
            onValueChange={(value) => {
              set({ font: value });
            }}
            options={FONTS.map((font) => ({ value: font.value, label: font.label }))}
          />
        </div>

        <div className="pg-field row">
          <div>
            <Label htmlFor="pg-languages">contentLocales</Label>
            <p>Write in English, German and French.</p>
          </div>
          <Switch
            id="pg-languages"
            checked={settings.severalContentLanguages}
            onCheckedChange={(checked) => {
              set({ severalContentLanguages: checked });
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── the output ────────────────────────────────────────────────────────────

const LABELS = {
  json: 'Document',
  html: 'Email',
  text: 'Plain text',
  page: 'Page',
  form: 'Live form',
  card: 'Card',
  popup: 'Live popup',
} as const;

/** The output's tabs, per kit: the document, and what a reader or visitor gets. */
const OUTPUT_TABS = {
  email: ['json', 'html', 'text'],
  article: ['json', 'page'],
  form: ['json', 'form'],
  card: ['json', 'card'],
  popup: ['json', 'popup'],
} as const satisfies Record<Kit, readonly Settings['output'][]>;

function Output({
  kit,
  email,
  article,
  form,
  card,
  popup,
  settings,
  set,
  copied,
  onCopy,
  resolveMedia,
}: {
  kit: Kit;
  email: EmailDocument;
  article: ArticleDocument;
  form: FormDocument;
  card: CardDocument;
  popup: PopupDocument;
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
  copied: string | null;
  onCopy: (what: string, text: string) => Promise<void>;
  resolveMedia: (key: string) => string;
}) {
  const tabs = OUTPUT_TABS[kit];
  const active = (tabs as readonly string[]).includes(settings.output) ? settings.output : 'json';
  const rendered = useMemo(
    () =>
      kit === 'email'
        ? renderEmail(email, { assetUrl: resolveMedia, data: SAMPLE_DATA, locale: 'en' })
        : null,
    [kit, email, resolveMedia],
  );
  const json = useMemo(
    () => JSON.stringify({ email, article, form, card, popup }[kit], null, 2),
    [kit, email, article, form, card, popup],
  );
  const dark = settings.theme === 'dark' || (settings.theme === 'auto' && settings.pageDark);
  const copyable =
    active === 'json'
      ? json
      : active === 'html'
        ? rendered?.html
        : active === 'text'
          ? rendered?.text
          : null;

  return (
    <aside className="pg-output" data-playground-output="" aria-label="Output">
      <Tabs
        value={active}
        onValueChange={(value) => {
          set({ output: value as Settings['output'] });
        }}
        className="pg-tabs"
      >
        <TabsList className="pg-tablist">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {LABELS[tab]}
            </TabsTrigger>
          ))}
          {copyable ? (
            <span className="pg-tabs-end">
              <Tooltip content={active === 'html' ? 'Copy the HTML' : 'Copy'} side="left">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Copy"
                  onClick={() => {
                    void onCopy('output', copyable);
                  }}
                >
                  {copied === 'output' ? <Check /> : <Copy />}
                </Button>
              </Tooltip>
            </span>
          ) : null}
        </TabsList>
      </Tabs>

      <div className="pg-output-body">
        {active === 'json' ? <pre className="pg-pre">{json}</pre> : null}
        {active === 'html' && rendered ? (
          <div className="pg-mail">
            <div className="pg-inbox">
              <span className="pg-avatar" aria-hidden="true">
                {DEFAULT_BRAND.name.slice(0, 1)}
              </span>
              <div>
                <strong>{DEFAULT_BRAND.name}</strong>
                <span>{rendered.subject || 'No subject yet'}</span>
                {rendered.preheader ? <small>{rendered.preheader}</small> : null}
              </div>
            </div>
            <iframe
              title="The rendered email"
              sandbox=""
              srcDoc={rendered.html}
              className="pg-frame"
            />
          </div>
        ) : null}
        {active === 'text' && rendered ? <pre className="pg-pre wrap">{rendered.text}</pre> : null}
        {active === 'form' ? (
          // The form as visitors get it: steps, logic and checks working; nothing is sent.
          <div className="pg-live-form">
            <FormView document={form} locale="en" assetUrl={resolveMedia} onSubmit={() => true} />
          </div>
        ) : null}
        {active === 'card' ? <CardOutput card={card} resolveMedia={resolveMedia} /> : null}
        {active === 'popup' ? <PopupOutput popup={popup} resolveMedia={resolveMedia} /> : null}
        {active === 'page' ? (
          // The page around the article, in the theme the article is shown in.
          <div className={dark ? 'pg-page dark' : 'pg-page light'}>
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

      <footer className="pg-output-foot">
        <Badge tone="ok">Saved in this browser</Badge>
        <span>
          {copied === 'blocked'
            ? 'This browser blocked the copy.'
            : 'Nothing leaves this tab; uploaded pictures last until it closes.'}
        </span>
      </footer>
    </aside>
  );
}

// ── the card and the popup, as people get them ────────────────────────────

/** The card's sides at a size that fits the output, filled in for an example member. */
function CardOutput({
  card,
  resolveMedia,
}: {
  card: CardDocument;
  resolveMedia: (key: string) => string;
}) {
  const [member, setMember] = useState(0);
  const record = EXAMPLE_MEMBERS[member] ?? EXAMPLE_MEMBERS[0];
  const root = card.nodes[card.root]?.props;
  const width = typeof root?.width === 'number' ? root.width : 85.6;
  // Pixels per millimetre: as large as the panel allows, never past 4.4.
  const scale = Math.min(4.4, 380 / width);
  return (
    <div className="pg-card-out">
      <SegmentedControl
        aria-label="Example member"
        value={String(member)}
        onValueChange={(value) => {
          setMember(Number(value));
        }}
        options={EXAMPLE_MEMBERS.map((example, index) => ({
          value: String(index),
          label: (example['member.name'] ?? '').split(' ')[0] ?? String(index + 1),
        }))}
      />
      {printedFaces(card).map((face) => (
        <figure key={face} className="pg-card-face">
          <CardView
            document={card}
            face={face}
            record={record}
            scale={scale}
            assetUrl={resolveMedia}
            style={{ boxShadow: '0 10px 30px rgb(15 23 42 / 0.18)' }}
          />
          <figcaption>{face === 'front' ? 'Front' : 'Back'}</figcaption>
        </figure>
      ))}
      <p className="pg-note">
        <code>CardView</code>, filled in for one member. <code>CardPrintSheet</code> prints every
        member&rsquo;s card at real size, with bleed and crop marks.
      </p>
    </div>
  );
}

/** What a click trigger listens for here: the made-up page's own button. */
const CLICK_TARGET = '[data-pg-popup-target]';

const OPENS = {
  load: () => 'Opens as the page loads.',
  delay: (seconds: number) => `Opens after ${String(seconds)} s — shortened here.`,
  scroll: (percent: number) => `Opens at ${String(percent)} % scrolled: scroll the page.`,
  exit: () => 'Opens when the mouse leaves the page at the top.',
  click: () => 'Opens on a click on the page’s button.',
};

/**
 * The popup on a made-up page, as a visitor meets it — its trigger, motion,
 * closing, inputs and thank-you — with the display rules off, as the editor's
 * preview has them. Nothing is sent.
 */
function PopupOutput({
  popup,
  resolveMedia,
}: {
  popup: PopupDocument;
  resolveMedia: (key: string) => string;
}) {
  const [run, setRun] = useState(0);
  const [scope, setScope] = useState<HTMLDivElement | null>(null);
  const format = popupFormatOf(popup);
  const { display } = format;
  // A fresh memory for every showing, so "Show again" always shows it.
  const store = useMemo(() => memoryStore({}, { session: String(run) }), [run]);
  const shown = useMemo<PopupDocument>(() => {
    const root = popup.nodes[popup.root];
    if (display.trigger !== 'click' || !root) return popup;
    return {
      ...popup,
      nodes: {
        ...popup.nodes,
        [popup.root]: {
          ...root,
          props: { ...format, display: { ...display, selector: CLICK_TARGET } },
        },
      },
    };
  }, [popup, format, display]);
  const value = display.trigger === 'delay' ? display.delay : display.scroll;
  const view = scope ? (
    <PopupView
      key={run}
      document={shown}
      locale="en"
      data={exampleData()}
      assetUrl={resolveMedia}
      store={store}
      rules={false}
      maxDelay={700}
      contained
      scope={scope}
    />
  ) : null;
  const inline = format.type === 'inline';

  return (
    <div className="pg-popup-out">
      <div className="pg-popup-bar">
        <span>{OPENS[display.trigger](value)}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRun((count) => count + 1);
          }}
        >
          <RotateCcw />
          Show again
        </Button>
      </div>
      <div className="pg-site">
        <div ref={setScope} className="pg-site-scroll">
          <div className="pg-site-nav">
            <strong>Your site</strong>
            <span />
            <span />
            <span />
          </div>
          <div className="pg-site-hero">
            <h3>A page of your site</h3>
            <p>The popup comes in over it as a visitor would see it.</p>
            <button type="button" data-pg-popup-target="">
              Get the offer
            </button>
          </div>
          {inline ? <div className="pg-site-inline">{view}</div> : null}
          <div className="pg-site-cards">
            <span />
            <span />
            <span />
          </div>
          <div className="pg-site-lines">
            {Array.from({ length: 14 }, (_, index) => (
              <span key={index} style={{ width: `${String(60 + ((index * 37) % 40))}%` }} />
            ))}
          </div>
        </div>
        {inline ? null : view}
      </div>
    </div>
  );
}
