import {
  createArticleDocument,
  createArticleRegistry,
  kitchenSinkDocument,
  type ArticleDocument,
} from '@builderset/article';
import { ArticleEditor } from '@builderset/article/editor';
import { createMemoryHost as articleHost } from '@builderset/article/host';
import { ArticleRenderer } from '@builderset/article/render';
import {
  createEmailRegistry,
  starterEmail,
  type EmailDocument,
  type EmailType,
} from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import { createMemoryHost as emailHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';
import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { Bar } from './bar';
import { applyToPage, readSettings, writeSettings, type Settings } from './settings';
import './page.css';

const route = location.pathname.replace(/\/+$/, '') || '/';

// Each route loads what a project would: one stylesheet per kit, or the
// article's content.css for a rendered article — and the hostile page CSS.
const stylesheets: Record<string, () => Promise<unknown>> = {
  '/email': () => import('@builderset/email/styles.css'),
  '/hostile': () => Promise.all([import('@builderset/email/styles.css'), import('./hostile.css')]),
  '/article': () => import('@builderset/article/styles.css'),
  '/article/view': () => import('@builderset/article/content.css'),
  '/page-button': () => import('@builderset/email/styles.css'),
};

const emailRegistry = createEmailRegistry();
const articleRegistry = createArticleRegistry();
const resetType: EmailType = {
  key: 'password_reset',
  label: { en: 'Password reset' },
  category: 'account',
  kind: 'transactional',
  variables: [{ name: 'reset_url', label: { en: 'Reset link' }, type: 'url', required: true }],
  mustUse: ['reset_url'],
  samples: { default: { reset_url: 'https://example.com/reset' } },
};
const emailDocument: EmailDocument = starterEmail(emailRegistry, {
  name: 'Welcome',
  subject: 'Welcome aboard',
});
const articleDocument: ArticleDocument =
  kitchenSinkDocument(articleRegistry) ?? createArticleDocument({ title: 'An article' });
const media = (key: string) => `https://picsum.photos/seed/${encodeURIComponent(key)}/1200/800`;
const toast = (kind: string, message: string) => {
  console.info(`[${kind}] ${message}`);
};

function App() {
  const [settings, setSettings] = useState<Settings>(readSettings);
  useEffect(() => {
    writeSettings(settings);
    applyToPage(settings);
  }, [settings]);
  const [ready, setReady] = useState(!stylesheets[route]);
  useEffect(() => {
    void stylesheets[route]?.().then(() => {
      setReady(true);
    });
  }, []);
  if (!ready) return null;
  const tokens = settings.primary ? { primary: settings.primary } : undefined;

  let body: ReactNode;
  if (route === '/email' || route === '/hostile') {
    body = (
      <EmailEditor
        document={emailDocument}
        registry={emailRegistry}
        host={emailHost<EmailDocument>({ document: emailDocument, toast })}
        type={resetType}
        brand={DEFAULT_BRAND}
        record={{ status: 'draft', scheduledAt: null, publishedAt: null }}
        onBack={() => {
          location.assign('/');
        }}
        theme={settings.theme}
        tokens={tokens}
      />
    );
  } else if (route === '/article') {
    body = (
      <ArticleEditor
        document={articleDocument}
        host={articleHost<ArticleDocument>({ document: articleDocument, toast })}
        record={{
          status: 'draft',
          scheduledAt: null,
          publishedAt: null,
          slug: 'kitchen-sink',
          locale: 'en',
        }}
        onRecordChange={() => undefined}
        onBack={() => {
          location.assign('/');
        }}
        theme={settings.theme}
        tokens={tokens}
      />
    );
  } else if (route === '/article/view') {
    body = (
      <main className="page">
        <ArticleRenderer
          document={articleDocument}
          registry={articleRegistry}
          resolveMedia={media}
          locale="en"
          theme={settings.theme === 'light' ? 'auto' : settings.theme}
        />
      </main>
    );
  } else if (route === '/page-button') {
    body = (
      <main className="page">
        <button type="button" className="page-button" data-page-button="">
          A button of the page's own
        </button>
      </main>
    );
  } else {
    body = (
      <main className="page">
        <h1>Builderset, in Vite with no Tailwind</h1>
        <ul>
          <li>
            <a href="/email">/email</a> — the email editor
          </li>
          <li>
            <a href="/article">/article</a> — the article editor
          </li>
          <li>
            <a href="/article/view">/article/view</a> — a rendered article, with content.css
          </li>
          <li>
            <a href="/hostile">/hostile</a> — the email editor on a page with a hostile stylesheet
          </li>
        </ul>
      </main>
    );
  }
  return (
    <>
      {body}
      <Bar settings={settings} onChange={setSettings} />
    </>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
