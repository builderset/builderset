import { pad, row, section } from '../../core';
import { button, divider, footerSection, heading, logoHeader, note, paragraph, v } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'password-reset',
  category: 'account',
  name: { en: 'Password reset', sq: 'Rivendosja e fjalëkalimit', de: 'Passwort zurücksetzen' },
  description: {
    en: 'A button to choose a new password, how long it works, and the link to paste',
    sq: 'Një buton për të zgjedhur fjalëkalim të ri, sa kohë vlen, dhe lidhja për ta ngjitur',
    de: 'Ein Knopf für ein neues Passwort, wie lange er gilt, und der Link zum Einfügen',
  },
  subject: 'Reset your {{ brand.name }} password',
  preheader: 'The link works for {{ reset.expires_minutes }} minutes.',
  settings: { font: 'inter' },
  variables: ['reset.url', 'reset.expires_minutes'],
  sections: [
    logoHeader('left'),
    section({ padding: pad(16, 32, 24) }, [
      row('100', [
        [
          heading('Reset your password', { size: 26 }),
          paragraph([
            'Hi ',
            v('recipient.name', 'there'),
            ', we received a request to reset the password for your ',
            v('brand.name'),
            ' account. Choose a new one with the button below.',
          ]),
          button('Choose a new password', '{{ reset.url }}'),
          note([
            'The link expires in ',
            v('reset.expires_minutes'),
            ' minutes and can be used once.',
          ]),
          divider(),
          note(
            'Didn’t ask for this? Ignore this email: your password stays the same, and nobody can change it without this link.',
          ),
          note('Button not working? Copy this link into your browser:', {
            padding: pad(8, 0, 0),
          }),
          note([v('reset.url')], { size: 12, color: 'brand.primary' }),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
