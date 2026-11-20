import { pad, row, section } from '../../core';
import {
  codeBox,
  divider,
  footerSection,
  heading,
  logoHeader,
  note,
  paragraph,
  v,
} from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'one-time-code',
  category: 'verification',
  name: { en: 'One-time code', sq: 'Kod njëpërdorimësh', de: 'Einmalcode' },
  description: {
    en: 'A short code, large and centred, with when it expires',
    sq: 'Një kod i shkurtër, i madh dhe në qendër, me kohën kur skadon',
    de: 'Ein kurzer Code, groß und zentriert, mit seiner Gültigkeit',
  },
  subject: 'Your code: {{ code }}',
  preheader: 'Enter it to continue. It expires in {{ code_expires_minutes }} minutes.',
  settings: { font: 'inter' },
  variables: ['code', 'code_expires_minutes'],
  sections: [
    logoHeader(),
    section({ padding: pad(8, 40, 32) }, [
      row('100', [
        [
          heading('Your verification code', { size: 24, align: 'center' }),
          paragraph(['Enter this code to continue in ', v('brand.name'), '.'], {
            align: 'center',
          }),
        ],
      ]),
      codeBox([v('code')]),
      row('100', [
        [
          note(['The code expires in ', v('code_expires_minutes'), ' minutes.'], {
            align: 'center',
          }),
          divider(),
          note(
            [
              'Didn’t ask for a code? You can ignore this email — someone may have typed your address by mistake. Never share this code: ',
              v('brand.name'),
              ' will never ask you for it.',
            ],
            { align: 'center' },
          ),
        ],
      ]),
    ]),
    footerSection(),
  ],
});
