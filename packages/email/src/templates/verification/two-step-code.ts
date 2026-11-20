import { pad, row, section } from '../../core';
import {
  button,
  codeBox,
  details,
  eyebrow,
  footerSection,
  heading,
  logoHeader,
  note,
  panel,
  paragraph,
  subheading,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'two-step-code',
  category: 'verification',
  name: { en: 'Two-step code', sq: 'Kod me dy hapa', de: 'Zwei-Faktor-Code' },
  description: {
    en: 'A code on a dark panel, the sign-in it is for, and what to do if it was not you',
    sq: 'Një kod mbi panel të errët, hyrja për të cilën është, dhe çfarë të bëni nëse s’ishit ju',
    de: 'Ein Code auf dunklem Feld, die Anmeldung dazu und was zu tun ist, wenn Sie es nicht waren',
  },
  subject: '{{ code }} is your {{ brand.name }} security code',
  preheader: 'Someone is signing in to your account. Is it you?',
  settings: { font: 'inter', backdrop: '#f1f5f9' },
  variables: [
    'code',
    'code_expires_minutes',
    'sign_in.at',
    'sign_in.device',
    'sign_in.location',
    'account.security_url',
  ],
  sections: [
    logoHeader('left'),
    section({ padding: pad(16, 32, 8) }, [
      row('100', [
        [
          eyebrow('Two-step verification'),
          heading('Confirm it’s you', { size: 26 }),
          paragraph([
            'Someone — hopefully you — is signing in to your ',
            v('brand.name'),
            ' account. Enter this code to finish:',
          ]),
        ],
      ]),
      codeBox([v('code')], { background: '#0f172a', color: '#ffffff' }),
      row('100', [
        [note(['It expires in ', v('code_expires_minutes'), ' minutes. Never share it.'])],
      ]),
    ]),
    section({ padding: pad(8, 32) }, [
      row('100', [
        [
          subheading('The sign-in attempt', { size: 16 }),
          details([
            ['When', '{{ sign_in.at | datetime }}'],
            ['Device', '{{ sign_in.device }}'],
            ['Location', '{{ sign_in.location }}'],
          ]),
        ],
      ]),
    ]),
    section({ padding: pad(16, 32, 24) }, [
      row('100', [
        panel(
          [
            subheading('Wasn’t you?', { size: 17, color: '#991b1b', padding: pad(0, 0, 4) }),
            paragraph(
              'Someone may know your password. Change it now and we will sign out every other device.',
              { size: 15 },
            ),
            button('Secure my account', '{{ account.security_url }}', { background: '#b91c1c' }),
          ],
          { background: '#fef2f2' },
        ),
      ]),
    ]),
    footerSection(),
  ],
});
