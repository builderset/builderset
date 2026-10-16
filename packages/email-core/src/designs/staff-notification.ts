import type { ElementRegistry } from '@motors/builder-core';

import type { EmailDocument } from '../document';
import { pad } from '../fields';
import { v } from '../rich-text';
import { block, buildEmail, row, section, tr } from '../sample';
import {
  eyebrow,
  inEvery,
  INK,
  MUTED,
  ON_INK,
  ORANGE,
  ORANGE_DEEP,
  PAPER,
  say,
  TEXT,
} from './palette';
import { masthead, siteFooter } from './parts';

/**
 * A staff notification, by email — for the members who turned email on for
 * that kind of notification on their preferences page.
 *
 * Short on purpose: the same thing is already in their bell. What the email
 * adds is reaching them away from the panel, so it says what happened, links
 * straight to it, and says how to stop these.
 *
 * Written in Albanian, English and German: sent in each member's own language.
 *
 * The variables are the `staff_notification` type's: the notification (its
 * `title`, `description`, `type` and the `url` that opens it), when it
 * happened, and the panel's links. Transactional: no unsubscribe link — the
 * way out is the preferences page, named in the footer.
 */
export function staffNotificationEmail(
  registry: ElementRegistry,
  options: { stable?: boolean } = {},
): EmailDocument {
  return buildEmail(
    registry,
    {
      stable: options.stable ?? false,
      meta: {
        name: 'Njoftim për stafin',
        subject: '{{ notification.title }}',
        preheader: tr(
          '{{ notification.type }} · marrimauto.com — hapeni në panel.',
          '{{ notification.type }} · marrimauto.com — open it in the panel.',
          '{{ notification.type }} · marrimauto.com — im Panel öffnen.',
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
      masthead(
        inEvery((l) => [
          { text: say(l, 'Njoftim · ', 'Notification · ', 'Benachrichtigung · ') },
          v('notification.type'),
        ]),
      ),

      section({ background: INK, padding: pad(26, 32, 36, 32) }, [
        row('100', [
          [
            eyebrow(
              tr('Diçka e re në panel', 'Something new in the panel', 'Neu im Panel'),
              ORANGE,
            ),
            block('heading', {
              text: [v('notification.title')],
              level: 1,
              size: 30,
              font: 'sora',
              weight: '700',
              letterSpacing: -0.6,
              color: PAPER,
              padding: pad(0, 0, 12, 0),
            }),
            block('text', {
              text: [v('notification.description')],
              size: 16,
              lineHeight: 1.65,
              color: ON_INK,
              padding: pad(0, 0, 24, 0),
              display: {
                hideOn: 'none',
                when: [{ var: 'notification.description', op: 'exists' }],
              },
            }),
            block('button', {
              label: tr('Hape në panel →', 'Open in the panel →', 'Im Panel öffnen →'),
              href: '{{ notification.url }}',
              background: ORANGE,
              textColor: PAPER,
              radius: 40,
              paddingX: 24,
              paddingY: 13,
              size: 15,
              weight: '600',
              align: 'left',
              padding: pad(0),
            }),
          ],
        ]),
      ]),

      section({ background: PAPER, padding: pad(22, 32, 26, 32) }, [
        row('100', [
          [
            block('text', {
              text: inEvery((l) => [
                { text: say(l, 'Ndodhi më ', 'Happened on ', 'Geschehen am ') },
                {
                  text: '{{notification.at}}',
                  marks: [{ type: 'variable', path: 'notification.at', format: 'datetime' }],
                },
                {
                  text: say(
                    l,
                    ' · E njëjta gjë është edhe te zilja e njoftimeve në panel.',
                    ' · The same is in the notification bell in the panel.',
                    ' · Dasselbe steht auch in der Glocke im Panel.',
                  ),
                },
              ]),
              size: 13,
              lineHeight: 1.55,
              color: MUTED,
              padding: pad(0),
            }),
          ],
        ]),
      ]),

      siteFooter({
        links: [
          { label: tr('Paneli', 'The panel', 'Das Panel'), href: '{{ site.admin_url }}' },
          {
            label: tr('Preferencat e njoftimeve', 'Notification preferences', 'Benachrichtigungen'),
            href: '{{ site.preferences_url }}',
          },
        ],
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
              ' sepse e keni zgjedhur emailin për këtë lloj njoftimi. Mund ta ndryshoni te Preferencat në panel.',
              ' because you chose email for this kind of notification. You can change that in Preferences in the panel.',
              ' gesendet, weil Sie für diese Art von Benachrichtigung E-Mail gewählt haben. Das lässt sich in den Einstellungen im Panel ändern.',
            ),
          },
        ]),
        unsubscribe: false,
      }),
    ],
  );
}

/** Realistic data for the preview and the parity fixture. */
export const STAFF_NOTIFICATION_SAMPLE: Record<string, unknown> = {
  recipient: { name: 'Arta Hoxha', email: 'arta@marrimauto.com' },
  notification: {
    title: 'Aplikim i ri: APP-2026-00123',
    description: 'AA123BB · web',
    type: 'Aplikim',
    importance: 'info',
    url: 'https://cc.marrimauto.com/applications?view=sample',
    at: '2026-10-03T09:15:00Z',
  },
  site: {
    admin_url: 'https://cc.marrimauto.com',
    preferences_url: 'https://cc.marrimauto.com/preferences',
  },
};
