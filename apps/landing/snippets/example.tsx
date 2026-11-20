'use client';
// #region example
import '@builderset/email/styles.css';
import { createEmailRegistry, starterEmail, type EmailDocument } from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import { createRestHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';

const registry = createEmailRegistry();
const host = createRestHost<EmailDocument>({
  baseUrl: '/api/emails/welcome', // your routes, your database
  resolveMedia: (key) => `https://cdn.example.com/${key}`,
  toast: (kind, message) => console.info(message),
});

export const Editor = () => (
  <EmailEditor
    document={starterEmail(registry)}
    registry={registry}
    host={host}
    type={null}
    brand={DEFAULT_BRAND}
    record={{ status: 'draft', scheduledAt: null, publishedAt: null }}
    onBack={() => history.back()}
  />
);
// #endregion example
