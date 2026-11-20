import { pad, row, section } from '../../core';
import { button, footerSection, heading, image, logoHeader, note, paragraph, v } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'confirm-email',
  category: 'verification',
  name: { en: 'Confirm email address', sq: 'Konfirmo adresën', de: 'E-Mail bestätigen' },
  description: {
    en: 'A white card on a soft background: one button to confirm, and the link to paste',
    sq: 'Një kartë e bardhë mbi sfond të butë: një buton për konfirmim, dhe lidhja për ta ngjitur',
    de: 'Eine weiße Karte auf zartem Grund: ein Knopf zum Bestätigen und der Link zum Einfügen',
  },
  subject: 'Confirm your email address',
  preheader: 'One click and your {{ brand.name }} account is ready to go.',
  settings: { backdrop: '#eef2ff', background: '#eef2ff' },
  variables: ['verify.url'],
  sections: [
    logoHeader(),
    section({ background: '#ffffff', radius: 16, padding: pad(40, 40, 32) }, [
      row('100', [
        [
          image('An envelope with a tick', { width: 96 }),
          heading('Confirm your email address', { size: 26, align: 'center' }),
          paragraph(
            [
              'Hi ',
              v('recipient.name', 'there'),
              ', please confirm that ',
              v('recipient.email'),
              ' is your address. It takes one click.',
            ],
            { align: 'center' },
          ),
          button('Confirm my email', '{{ verify.url }}', { align: 'center', paddingX: 32 }),
          note('The link works for 24 hours.', { align: 'center' }),
        ],
      ]),
    ]),
    section({ padding: pad(24, 40, 0) }, [
      row('100', [
        [
          note('Button not working? Paste this link into your browser:', {
            align: 'center',
            padding: pad(0),
          }),
          note([v('verify.url')], { align: 'center', size: 12, color: 'brand.primary' }),
          note('Didn’t create an account? Ignore this email and the address will not be used.', {
            align: 'center',
          }),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
