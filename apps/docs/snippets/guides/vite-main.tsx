// #region lazy
import { createEmailRegistry, starterEmail, type EmailDocument } from '@builderset/email';
import { createRestHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

// The editor is the heavy part: load it, and its stylesheet, only on the page that edits.
const EmailEditor = lazy(async () => {
  const [module] = await Promise.all([
    import('@builderset/email/editor'),
    import('@builderset/email/styles.css'),
  ]);
  return { default: module.EmailEditor };
});
// #endregion lazy

const registry = createEmailRegistry();
const document: EmailDocument = starterEmail(registry, {
  name: 'Welcome',
  subject: 'Welcome aboard',
});
const host = createRestHost<EmailDocument>({
  baseUrl: '/api/emails/welcome',
  resolveMedia: (key) => `https://cdn.example.com/${key}`,
  toast: (kind, message) => {
    console.info(`[${kind}] ${message}`);
  },
});

createRoot(window.document.querySelector('#root') ?? window.document.body).render(
  <StrictMode>
    <Suspense fallback={<p>Loading the editor…</p>}>
      <EmailEditor
        document={document}
        registry={registry}
        host={host}
        type={null}
        brand={DEFAULT_BRAND}
        record={{ status: 'draft', scheduledAt: null, publishedAt: null }}
        onBack={() => {
          history.back();
        }}
      />
    </Suspense>
  </StrictMode>,
);
