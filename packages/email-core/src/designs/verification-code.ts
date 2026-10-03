import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import { v } from '../rich-text';
import { block, buildEmail, row, section, tr } from '../sample';
import {
  bold,
  eyebrow,
  inEvery,
  INK,
  LINE,
  MIST,
  MUTED,
  ORANGE_DEEP,
  ORANGE_SOFT,
  PAPER,
  say,
  TEXT,
  tt,
  when,
  wordmark,
} from './palette';

/**
 * A one-time verification code, in the newsletter's look.
 *
 * The code is the whole point, so it is the largest thing in the email —
 * spaced out in Sora on a soft orange card, readable at a glance and easy to
 * copy — and it is in the subject line too, which is where most people read
 * it (the notification on the phone). Everything else answers the two
 * questions a reader has: how long does it work, and what if it was not me.
 *
 * Written in Albanian, English and German: one design, sent in the reader's
 * language.
 *
 * The variables are the `verification_code` email type's: `code`, what it is
 * for (`purpose`), `expires_minutes`, and — when the request carries them — when, from
 * which device and where it was asked for. The request box hides when there is
 * no device to show. Transactional: no unsubscribe link, by design.
 */
export function verificationCodeEmail(
  registry: ElementRegistry,
  options: { stable?: boolean } = {},
): EmailDocument {
  return buildEmail(
    registry,
    {
      stable: options.stable ?? false,
      meta: {
        name: 'Kodi i verifikimit',
        subject: tr(
          '{{ code }} është kodi juaj i verifikimit',
          '{{ code }} is your verification code',
          '{{ code }} ist Ihr Bestätigungscode',
        ),
        preheader: tr(
          'Kodi skadon pas {{ expires_minutes }} minutash. Mos ia jepni askujt — as ekipit tonë.',
          'The code expires in {{ expires_minutes }} minutes. Do not give it to anyone — not even our team.',
          'Der Code läuft in {{ expires_minutes }} Minuten ab. Geben Sie ihn niemandem weiter — auch nicht unserem Team.',
        ),
      },
      settings: {
        width: 600,
        backdrop: '#eceef2',
        background: PAPER,
        font: 'poppins',
        fontSize: 16,
        lineHeight: 1.6,
        textColor: TEXT,
        headingColor: TEXT,
        linkColor: ORANGE_DEEP,
        darkMode: 'auto',
      },
    },
    [
      // ── Masthead ────────────────────────────────────────────────────────
      section({ background: INK, padding: pad(22, 32, 22, 32) }, [
        row(
          '50-50',
          [
            [wordmark()],
            [
              block('text', {
                text: tt(tr('Siguria e llogarisë', 'Account security', 'Kontosicherheit')),
                size: 12,
                weight: '500',
                letterSpacing: 1,
                transform: 'uppercase',
                align: 'right',
                color: '#9aa3ae',
                padding: pad(6, 0, 0, 0),
              }),
            ],
          ],
          { verticalAlign: 'middle', gap: 12 },
        ),
      ]),

      // ── The code ────────────────────────────────────────────────────────
      section({ background: PAPER, padding: pad(40, 40, 12, 40) }, [
        row('100', [
          [
            eyebrow(
              tr('Kodi i verifikimit', 'Verification code', 'Bestätigungscode'),
              ORANGE_DEEP,
              { align: 'center' },
            ),
            block('heading', {
              text: tt(
                tr(
                  'Konfirmoni që jeni ju',
                  'Confirm it is you',
                  'Bestätigen Sie, dass Sie es sind',
                ),
              ),
              level: 1,
              size: 30,
              font: 'sora',
              letterSpacing: -0.6,
              align: 'center',
              padding: pad(0, 0, 12, 0),
            }),
            block('text', {
              text: inEvery((l) => [
                {
                  text: say(
                    l,
                    'Përdorni këtë kod për ',
                    'Use this code for ',
                    'Verwenden Sie diesen Code für ',
                  ),
                },
                {
                  text: '{{purpose}}',
                  marks: [
                    { type: 'bold' },
                    {
                      type: 'variable',
                      path: 'purpose',
                      fallback: say(l, 'llogarinë tuaj', 'your account', 'Ihr Konto'),
                    },
                  ],
                },
                {
                  text: say(
                    l,
                    '. Vendoseni në faqen ku e kërkuat.',
                    '. Enter it on the page where you asked for it.',
                    '. Geben Sie ihn auf der Seite ein, auf der Sie ihn angefordert haben.',
                  ),
                },
              ]),
              size: 16,
              lineHeight: 1.6,
              color: MUTED,
              align: 'center',
              padding: pad(0, 0, 26, 0),
            }),
          ],
        ]),
        row('100', [
          {
            props: {
              background: ORANGE_SOFT,
              radius: 18,
              borderWidth: 1,
              borderColor: '#f3d4bd',
              padding: pad(26, 16, 22, 16),
            },
            blocks: [
              block('heading', {
                text: [v('code')],
                level: 2,
                size: 44,
                font: 'sora',
                weight: '700',
                letterSpacing: 10,
                align: 'center',
                color: INK,
                padding: pad(0, 0, 8, 0),
              }),
              block('text', {
                text: inEvery((l) => [
                  { text: say(l, '⏱  Skadon pas ', '⏱  Expires in ', '⏱  Läuft ab in ') },
                  {
                    text: '{{expires_minutes}}',
                    marks: [{ type: 'bold' }, { type: 'variable', path: 'expires_minutes' }],
                  },
                  {
                    text: say(
                      l,
                      ' minutash · përdoret vetëm një herë',
                      ' minutes · works only once',
                      ' Minuten · nur einmal gültig',
                    ),
                  },
                ]),
                size: 13,
                color: '#8a4a17',
                align: 'center',
                padding: pad(0),
              }),
            ],
          },
        ]),
      ]),

      // ── Who asked (only when the request says) ─────────────────────────
      section(
        {
          background: PAPER,
          padding: pad(18, 40, 6, 40),
          display: when('request.device', 'exists'),
        },
        [
          row('100', [
            [
              eyebrow(tr('Kërkesa', 'The request', 'Die Anfrage'), MUTED, {
                size: 11,
                padding: pad(8, 0, 6, 0),
              }),
              block('key-value', {
                rows: [
                  { label: tr('Koha', 'Time', 'Zeit'), value: '{{ request.at | datetime }}' },
                  { label: tr('Pajisja', 'Device', 'Gerät'), value: '{{ request.device }}' },
                  {
                    label: tr('Vendndodhja', 'Location', 'Standort'),
                    value: '{{ request.location }}',
                  },
                ],
                size: 14,
                labelColor: MUTED,
                valueColor: TEXT,
                borderColor: LINE,
                background: null,
                padding: pad(0),
              }),
            ],
          ]),
        ],
      ),

      // ── Not you? ────────────────────────────────────────────────────────
      section({ background: PAPER, padding: pad(22, 40, 36, 40) }, [
        row('100', [
          {
            props: {
              background: MIST,
              radius: 14,
              borderWidth: 1,
              borderColor: LINE,
              padding: pad(18, 20, 18, 20),
            },
            blocks: [
              block('text', {
                text: inEvery((l) => [
                  bold(say(l, '🔒  Nuk e kërkuat ju? ', '🔒  Not you? ', '🔒  Nicht Sie? ')),
                  {
                    text: say(
                      l,
                      'Injorojeni këtë email — pa kodin askush nuk hyn dot. Mos ia jepni kodin askujt: ekipi i blejmauto.com nuk do t’jua kërkojë kurrë, as në telefon.',
                      'Ignore this email — without the code nobody can get in. Do not give the code to anyone: the blejmauto.com team will never ask you for it, not even on the phone.',
                      'Ignorieren Sie diese E-Mail — ohne den Code kommt niemand hinein. Geben Sie den Code niemandem: Das Team von blejmauto.com wird Sie nie danach fragen, auch nicht am Telefon.',
                    ),
                  },
                ]),
                size: 14,
                lineHeight: 1.6,
                color: TEXT,
                padding: pad(0),
              }),
            ],
          },
        ]),
      ]),

      // ── Footer ──────────────────────────────────────────────────────────
      section({ background: MIST, padding: pad(26, 32, 28, 32) }, [
        row('100', [
          [
            block('menu', {
              items: [
                { label: 'blejmauto.com', href: '{{ brand.website }}' },
                { label: tr('Ndihmë', 'Help', 'Hilfe'), href: '{{ support_url }}' },
              ],
              color: TEXT,
              size: 13,
              separator: 'dot',
              align: 'center',
              padding: pad(0, 0, 12, 0),
            }),
            block('footer', {
              text: inEvery((l) => [
                {
                  text: say(
                    l,
                    'Ky email u dërgua te ',
                    'This email was sent to ',
                    'Diese E-Mail wurde an ',
                  ),
                },
                v('recipient.email'),
                {
                  text: say(
                    l,
                    ' sepse u kërkua një kod verifikimi për llogarinë tuaj.',
                    ' because a verification code was requested for your account.',
                    ' gesendet, weil für Ihr Konto ein Bestätigungscode angefordert wurde.',
                  ),
                },
              ]),
              showAddress: true,
              showUnsubscribe: false,
              showPreferences: false,
              showViewInBrowser: false,
              color: MUTED,
              size: 12,
              align: 'center',
              padding: pad(0),
            }),
          ],
        ]),
      ]),
    ],
  );
}

/** Realistic data for the preview and the parity fixture. */
export const VERIFICATION_CODE_SAMPLE: Record<string, unknown> = {
  recipient: { name: 'Arta Hoxha', email: 'arta@example.com' },
  code: '482917',
  purpose: 'hyrjen në llogarinë tuaj',
  expires_minutes: 10,
  request: {
    at: '2026-10-02T19:35:00Z',
    device: 'Chrome në Windows',
    location: 'Tiranë, Shqipëri',
  },
  support_url: 'https://blejmauto.com/contact',
};
