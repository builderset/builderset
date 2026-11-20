import { renderEmail } from '@builderset/email/render';
import { Router } from 'express';

import { pool } from '../db';
import { bodyOf, conflict, notFound, textOf } from '../http';
import { getRow, person, sideFilter } from '../models/base';
import type { EmailTemplate } from '../models/emails';
import { absoluteUrlOf } from '../storage';

/**
 * What leaves the server: the article your site shows and the email your
 * mailer sends. Both read the live `document`, never the draft, and the
 * browser never sends HTML: the server renders what it stored and checked.
 */

/** GET /api/public/articles/:locale/:slug — the published article, for your site. */
export const publicArticles = Router();

publicArticles.get('/:locale/:slug', async (req, res) => {
  const { rows } = await pool.query(
    `select t.uuid as id, t.document, t.title, t.excerpt, t.cover_key, t.cover_alt,
            t.published_at, ${person('author_id')}
       from article t
      where t.locale = $1 and t.slug = $2 and t.status = 'published' and ${sideFilter('live')}`,
    [req.params.locale, req.params.slug],
  );
  if (!rows[0]) throw notFound('article');
  res.json(rows[0]);
});

/** POST /api/emails/:id/send — `{ data, locale }`: the email, rendered for your mailer to send. */
export const emailDelivery = Router();

emailDelivery.post('/:id/send', async (req, res) => {
  const template = await getRow<EmailTemplate>(
    pool,
    'email_template',
    'email template',
    req.params.id,
  );
  if (template.status !== 'published')
    throw conflict('This email template is a draft: publish it before sending it.');
  const body = bodyOf(req);
  const data =
    typeof body.data === 'object' && body.data !== null && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : {};
  const { subject, html, text } = renderEmail(template.document, {
    data,
    locale: textOf(body.locale, 10) ?? undefined,
    assetUrl: absoluteUrlOf,
  });
  res.json({ subject, html, text });
});
