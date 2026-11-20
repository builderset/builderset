import { pad, row, section } from '../../core';
import {
  button,
  details,
  footerSection,
  heading,
  logoHeader,
  panel,
  paragraph,
  subheading,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'password-changed',
  category: 'account',
  name: { en: 'Password changed', sq: 'Fjalëkalimi u ndryshua', de: 'Passwort geändert' },
  description: {
    en: 'A note that the password changed — when and where — and a way out if it was not them',
    sq: 'Një njoftim që fjalëkalimi ndryshoi — kur dhe ku — dhe çfarë të bëjnë nëse s’ishin ata',
    de: 'Ein Hinweis, dass das Passwort geändert wurde — wann und wo — und was zu tun ist, wenn nicht',
  },
  subject: 'Your {{ brand.name }} password was changed',
  preheader: 'If this was you, there is nothing else to do.',
  settings: { font: 'inter', backdrop: '#f1f5f9' },
  variables: ['password.changed_at', 'password.device', 'account.security_url'],
  sections: [
    logoHeader('left'),
    section({ padding: pad(16, 32, 8) }, [
      row('100', [
        [
          heading('Your password was changed', { size: 26 }),
          paragraph([
            'Hi ',
            v('recipient.name', 'there'),
            ', the password for your ',
            v('brand.name'),
            ' account was just changed. If this was you, there is nothing else to do.',
          ]),
          details([
            ['Account', '{{ recipient.email }}'],
            ['Changed', '{{ password.changed_at | datetime }}'],
            ['Device', '{{ password.device }}'],
          ]),
        ],
      ]),
    ]),
    section({ padding: pad(8, 32, 24) }, [
      row('100', [
        panel(
          [
            subheading('Didn’t change it?', { size: 17, color: '#9a3412', padding: pad(0, 0, 4) }),
            paragraph(
              'Secure your account right away: we will help you choose a new password and sign out every other device.',
              { size: 15 },
            ),
            button('Secure my account', '{{ account.security_url }}', { background: '#c2410c' }),
          ],
          { background: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
        ),
      ]),
    ]),
    footerSection(),
  ],
});
