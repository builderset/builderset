import { createEmailRegistry, type EmailDocument } from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import type { BuilderHost } from '@builderset/email/host';
import { DEFAULT_BRAND } from '@builderset/email/render';

const registry = createEmailRegistry();

/** The theme from JavaScript: a tenant's own colour, and dark mode from the app's own setting. */
export function TenantEmailEditor(props: {
  document: EmailDocument;
  host: BuilderHost<EmailDocument>;
  tenant: { color: string };
  dark: boolean;
}) {
  return (
    <EmailEditor
      document={props.document}
      registry={registry}
      host={props.host}
      type={null}
      brand={DEFAULT_BRAND}
      record={{ status: 'draft', scheduledAt: null, publishedAt: null }}
      onBack={() => {
        history.back();
      }}
      theme={props.dark ? 'dark' : 'light'}
      tokens={{ primary: props.tenant.color, radius: '0.5rem' }}
    />
  );
}
