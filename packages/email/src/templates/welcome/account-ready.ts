import { pad, row, section } from '../../core';
import {
  button,
  details,
  footerSection,
  heading,
  image,
  logoHeader,
  note,
  paragraph,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'account-ready',
  category: 'welcome',
  name: { en: 'Account ready', sq: 'Llogaria gati', de: 'Konto bereit' },
  description: {
    en: 'A short confirmation that the account exists, with its details to keep',
    sq: 'Një konfirmim i shkurtër që llogaria u krijua, me të dhënat për t’u ruajtur',
    de: 'Eine kurze Bestätigung, dass das Konto angelegt ist, mit den Angaben zum Aufbewahren',
  },
  subject: 'Your {{ brand.name }} account is ready',
  preheader: 'Here are your account details — keep this email for later.',
  settings: { backdrop: '#ecfdf5', background: '#ecfdf5', font: 'manrope' },
  variables: ['account.plan', 'account.created_at', 'account.url'],
  sections: [
    logoHeader(),
    section({ background: '#ffffff', radius: 16, padding: pad(36, 40, 32) }, [
      row('100', [
        [
          image('A green tick in a circle', { width: 72 }),
          heading('Your account is ready', { size: 26, align: 'center' }),
          paragraph(
            [
              'Hi ',
              v('recipient.name', 'there'),
              ', your ',
              v('brand.name'),
              ' account has been created. Here are the details to keep:',
            ],
            { align: 'center' },
          ),
          details([
            ['Email', '{{ recipient.email }}'],
            ['Plan', '{{ account.plan }}'],
            ['Created', '{{ account.created_at | date_long }}'],
          ]),
          button('Sign in', '{{ account.url }}', {
            align: 'center',
            paddingX: 40,
            background: '#059669',
          }),
          note('Didn’t create this account? Reply to this email and we will look into it.', {
            align: 'center',
          }),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
