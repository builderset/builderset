import { pad, row, section } from '../../core';
import { button, divider, footerSection, heading, logoHeader, note, paragraph, v } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'magic-link',
  category: 'verification',
  name: { en: 'Sign-in link', sq: 'Lidhje hyrjeje', de: 'Anmeldelink' },
  description: {
    en: 'A plain, left-aligned note with one button that signs the reader in',
    sq: 'Një shënim i thjeshtë, majtas, me një buton që e fut lexuesin në llogari',
    de: 'Eine schlichte, linksbündige Nachricht mit einem Knopf, der den Leser anmeldet',
  },
  subject: 'Your sign-in link for {{ brand.name }}',
  preheader: 'No password needed — the link works once, for a short while.',
  settings: { backdrop: '#ffffff', width: 560 },
  variables: ['sign_in.url', 'sign_in.expires_minutes'],
  sections: [
    logoHeader('left', { padding: pad(40, 24, 8) }),
    section({ padding: pad(16, 24, 24) }, [
      row('100', [
        [
          heading(['Sign in to ', v('brand.name')], { size: 26 }),
          paragraph([
            'Hi ',
            v('recipient.name', 'there'),
            ', click the button below to sign in. No password needed.',
          ]),
          button('Sign in to {{ brand.name }}', '{{ sign_in.url }}', { radius: 6 }),
          note([
            'The link expires in ',
            v('sign_in.expires_minutes'),
            ' minutes and can only be used once.',
          ]),
          divider(),
          note(
            'Didn’t try to sign in? You can ignore this email — your account is safe, and nobody can sign in without this link.',
          ),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
