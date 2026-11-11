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
  ORANGE,
  ORANGE_DEEP,
  ORANGE_SOFT,
  PAPER,
  say,
  TEXT,
  tt,
  wordmark,
} from './palette';

/**
 * The invitation to the staff panel, sent when an administrator adds a member
 * and again from "Resend invitation" — one design for both.
 *
 * It carries the member's sign-in details — the address they sign in with and
 * the panel's address — but never a password: the button opens a single-use,
 * expiring link where they choose their own, and accepting it is what
 * activates the account. The legacy welcome email sent a generated password in
 * plain text; this one says, in so many words, that no password ever will be.
 *
 * Written in Albanian, English and German: one design, sent in the member's
 * language.
 *
 * The variables are the `member_invitation` email type's: `full_name`,
 * `email` (the sign-in address), `invite_url`, `login_url` and `link_days`.
 * Transactional: no unsubscribe link, by design.
 */
export function memberInvitationEmail(
  registry: ElementRegistry,
  options: { stable?: boolean } = {},
): EmailDocument {
  return buildEmail(
    registry,
    {
      stable: options.stable ?? false,
      meta: {
        name: 'Ftesë në ekip',
        subject: tr(
          'Ftesë për në panelin e stafit të marrimauto',
          'Your invitation to the marrimauto staff panel',
          'Ihre Einladung zum Mitarbeiterportal von marrimauto',
        ),
        preheader: tr(
          'Vendosni fjalëkalimin tuaj dhe hyni — lidhja vlen {{ link_days }} ditë.',
          'Choose your password and sign in — the link works for {{ link_days }} days.',
          'Wählen Sie Ihr Passwort und melden Sie sich an — der Link gilt {{ link_days }} Tage.',
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
                text: tt(tr('Paneli i stafit', 'Staff panel', 'Mitarbeiterportal')),
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

      // ── Welcome ─────────────────────────────────────────────────────────
      section({ background: PAPER, padding: pad(40, 40, 12, 40) }, [
        row('100', [
          [
            eyebrow(tr('Ftesë në ekip', 'Team invitation', 'Team-Einladung'), ORANGE_DEEP),
            block('heading', {
              text: inEvery((l) => [
                { text: say(l, 'Mirë se vini, ', 'Welcome, ', 'Willkommen, ') },
                {
                  text: '{{full_name}}',
                  marks: [
                    {
                      type: 'variable',
                      path: 'full_name',
                      fallback: say(l, 'në ekip', 'to the team', 'im Team'),
                    },
                  ],
                },
              ]),
              level: 1,
              size: 30,
              font: 'sora',
              letterSpacing: -0.6,
              padding: pad(0, 0, 12, 0),
            }),
            block('text', {
              text: inEvery((l) => [
                {
                  text: say(
                    l,
                    'Ju jeni shtuar si përdorues i panelit të stafit të marrimauto.com. Për të hyrë, zgjidhni fjalëkalimin tuaj me butonin më poshtë — llogaria aktivizohet sapo ta bëni.',
                    'You have been added as a user of the marrimauto.com staff panel. To sign in, choose your password with the button below — your account is activated as soon as you do.',
                    'Sie wurden als Nutzer des Mitarbeiterportals von marrimauto.com angelegt. Wählen Sie über die Schaltfläche unten Ihr Passwort — damit wird Ihr Konto aktiviert.',
                  ),
                },
              ]),
              size: 16,
              lineHeight: 1.6,
              color: MUTED,
              padding: pad(0, 0, 24, 0),
            }),
          ],
        ]),

        // ── The sign-in details ─────────────────────────────────────────
        row('100', [
          {
            props: {
              background: ORANGE_SOFT,
              radius: 18,
              borderWidth: 1,
              borderColor: '#f3d4bd',
              padding: pad(20, 22, 20, 22),
            },
            blocks: [
              eyebrow(
                tr('Të dhënat e hyrjes', 'Your sign-in details', 'Ihre Anmeldedaten'),
                '#8a4a17',
                { size: 11, padding: pad(0, 0, 8, 0) },
              ),
              block('key-value', {
                rows: [
                  {
                    label: tr('Email-i i hyrjes', 'Sign-in email', 'Anmelde-E-Mail'),
                    value: '{{ email }}',
                  },
                  {
                    label: tr('Paneli', 'Panel', 'Portal'),
                    value: '{{ login_url }}',
                  },
                  {
                    label: tr('Fjalëkalimi', 'Password', 'Passwort'),
                    value: tr(
                      'E zgjidhni ju — nuk dërgohet kurrë me email',
                      'You choose it — it is never sent by email',
                      'Sie wählen es selbst — es wird nie per E-Mail gesendet',
                    ),
                  },
                ],
                size: 14,
                labelColor: '#8a4a17',
                valueColor: INK,
                borderColor: '#f3d4bd',
                background: null,
                padding: pad(0),
              }),
            ],
          },
        ]),
        row('100', [
          [
            block('button', {
              label: tr('Vendosni fjalëkalimin →', 'Set your password →', 'Passwort festlegen →'),
              href: '{{ invite_url }}',
              background: ORANGE,
              textColor: PAPER,
              radius: 40,
              paddingX: 24,
              paddingY: 13,
              size: 15,
              weight: '600',
              align: 'left',
              padding: pad(26, 0, 16, 0),
            }),
            block('text', {
              text: inEvery((l) => [
                { text: say(l, '⏱  Lidhja vlen ', '⏱  The link works for ', '⏱  Der Link gilt ') },
                {
                  text: '{{link_days}}',
                  marks: [{ type: 'bold' }, { type: 'variable', path: 'link_days' }],
                },
                {
                  text: say(
                    l,
                    ' ditë dhe përdoret vetëm një herë. Nëse skadon, kërkojini administratorit t’jua dërgojë sërish ftesën.',
                    ' days and only once. If it expires, ask your administrator to resend the invitation.',
                    ' Tage und nur einmal. Ist er abgelaufen, bitten Sie Ihre Administration, die Einladung erneut zu senden.',
                  ),
                },
              ]),
              size: 13,
              lineHeight: 1.6,
              color: MUTED,
              padding: pad(0, 0, 10, 0),
            }),
            block('text', {
              text: inEvery((l) => [
                {
                  text: say(
                    l,
                    'Butoni nuk hapet? Kopjoni këtë lidhje në shfletues: ',
                    'Button not working? Copy this link into your browser: ',
                    'Die Schaltfläche funktioniert nicht? Kopieren Sie diesen Link in Ihren Browser: ',
                  ),
                },
                v('invite_url'),
              ]),
              size: 12,
              lineHeight: 1.5,
              color: MUTED,
              padding: pad(0),
            }),
          ],
        ]),
      ]),

      // ── Not expecting it? ───────────────────────────────────────────────
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
                  bold(
                    say(
                      l,
                      '🔒  Nuk e prisnit këtë ftesë? ',
                      '🔒  Not expecting this? ',
                      '🔒  Nicht erwartet? ',
                    ),
                  ),
                  {
                    text: say(
                      l,
                      'Injorojeni këtë email — llogaria mbetet joaktive derisa dikush të vendosë fjalëkalimin me këtë lidhje. Mos ia përcillni askujt.',
                      'Ignore this email — the account stays inactive until a password is set through this link. Do not forward it to anyone.',
                      'Ignorieren Sie diese E-Mail — das Konto bleibt inaktiv, bis über diesen Link ein Passwort festgelegt wird. Leiten Sie sie an niemanden weiter.',
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
                { label: 'marrimauto.com', href: '{{ brand.website }}' },
                {
                  label: tr('Paneli i stafit', 'Staff panel', 'Mitarbeiterportal'),
                  href: '{{ login_url }}',
                },
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
                    ' sepse një administrator ju shtoi në panelin e stafit.',
                    ' because an administrator added you to the staff panel.',
                    ' gesendet, weil eine Administratorin oder ein Administrator Sie zum Mitarbeiterportal hinzugefügt hat.',
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
export const MEMBER_INVITATION_SAMPLE: Record<string, unknown> = {
  recipient: { name: 'Arta Hoxha', email: 'arta@marrimauto.com' },
  full_name: 'Arta Hoxha',
  email: 'arta@marrimauto.com',
  invite_url: 'https://cc.marrimauto.com/accept-invitation/sample',
  login_url: 'https://cc.marrimauto.com/login',
  link_days: 7,
};
