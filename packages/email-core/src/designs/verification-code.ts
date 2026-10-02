import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import { v } from '../rich-text';
import { block, buildEmail, row, section } from '../sample';
import {
  bold,
  eyebrow,
  INK,
  LINE,
  MIST,
  MUTED,
  ORANGE_DEEP,
  ORANGE_SOFT,
  PAPER,
  t,
  TEXT,
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
        subject: '{{ code }} është kodi juaj i verifikimit',
        preheader:
          'Kodi skadon pas {{ expires_minutes }} minutash. Mos ia jepni askujt — as ekipit tonë.',
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
                text: t('Siguria e llogarisë'),
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
            eyebrow('Kodi i verifikimit', ORANGE_DEEP, { align: 'center' }),
            block('heading', {
              text: t('Konfirmoni që jeni ju'),
              level: 1,
              size: 30,
              font: 'sora',
              letterSpacing: -0.6,
              align: 'center',
              padding: pad(0, 0, 12, 0),
            }),
            block('text', {
              text: [
                { text: 'Përdorni këtë kod për ' },
                {
                  text: '{{purpose}}',
                  marks: [
                    { type: 'bold' },
                    { type: 'variable', path: 'purpose', fallback: 'llogarinë tuaj' },
                  ],
                },
                { text: '. Vendoseni në faqen ku e kërkuat.' },
              ],
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
                text: [
                  { text: '⏱  Skadon pas ' },
                  {
                    text: '{{expires_minutes}}',
                    marks: [{ type: 'bold' }, { type: 'variable', path: 'expires_minutes' }],
                  },
                  { text: ' minutash · përdoret vetëm një herë' },
                ],
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
              eyebrow('Kërkesa', MUTED, { size: 11, padding: pad(8, 0, 6, 0) }),
              block('key-value', {
                rows: [
                  { label: 'Koha', value: '{{ request.at | datetime }}' },
                  { label: 'Pajisja', value: '{{ request.device }}' },
                  { label: 'Vendndodhja', value: '{{ request.location }}' },
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
                text: [
                  bold('🔒  Nuk e kërkuat ju? '),
                  {
                    text: 'Injorojeni këtë email — pa kodin askush nuk hyn dot. Mos ia jepni kodin askujt: ekipi i blejmauto.com nuk do t’jua kërkojë kurrë, as në telefon.',
                  },
                ],
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
                { label: 'Ndihmë', href: '{{ support_url }}' },
              ],
              color: TEXT,
              size: 13,
              separator: 'dot',
              align: 'center',
              padding: pad(0, 0, 12, 0),
            }),
            block('footer', {
              text: [
                { text: 'Ky email u dërgua te ' },
                v('recipient.email'),
                { text: ' sepse u kërkua një kod verifikimi për llogarinë tuaj.' },
              ],
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
