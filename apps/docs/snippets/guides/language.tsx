import { createEmailRegistry, type EmailDocument } from '@builderset/email';
import { EmailEditor } from '@builderset/email/editor';
import type { BuilderHost } from '@builderset/email/host';
import { de } from '@builderset/email/locales/de';
import { sq } from '@builderset/email/locales/sq';
import { DEFAULT_BRAND } from '@builderset/email/render';

const registry = createEmailRegistry();

export function LocalisedEmailEditor(props: {
  document: EmailDocument;
  host: BuilderHost<EmailDocument>;
  userLanguage: string;
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
      // The editor's own words: buttons, menus, messages. English is built in.
      locale={props.userLanguage}
      locales={{ sq, de }}
      // The languages a template itself can be written in: more than one shows a language switch.
      contentLocales={['en', 'de', 'sq']}
      defaultContentLocale="en"
    />
  );
}
