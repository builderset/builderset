/**
 * The Builderset checker: the kits' own checks behind two HTTP routes, for a
 * backend that is not written in JavaScript or Python (Laravel, Spring Boot,
 * ASP.NET Core). Run it beside your app, on a private port only your app can
 * reach — it trusts every caller and stores nothing.
 *
 *   POST /check/{kit}    { document, level: "draft" | "publish", type? }
 *                        → 200 { ok: true, document } | 200 { ok: false, issues }
 *   POST /answers/form   { form, answers }      → 200 { ok, errors, values }
 *   POST /answers/popup  { popup, values }      → 200 { ok, errors, values }
 *   POST /render/email   { document, data, locale?, assetBase }
 *                        → 200 { subject, html, text }
 *
 * `node --experimental-strip-types server.ts` (Node 22.6+), or build it with your
 * TypeScript setup. CHECKER_PORT picks the port (default 4319).
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import {
  checkArticle,
  createArticleRegistry,
  isDraftBlocking as articleDraftBlocks,
  isPublishBlocking as articlePublishBlocks,
  parseArticle,
} from '@builderset/article';
import {
  checkCard,
  createCardRegistry,
  isDraftBlocking as cardDraftBlocks,
  isPrintBlocking as cardPrintBlocks,
  parseCard,
  type CardDocument,
} from '@builderset/card';
import {
  checkEmail,
  createEmailRegistry,
  isDraftBlocking as emailDraftBlocks,
  isPublishBlocking as emailPublishBlocks,
  parseEmail,
  type EmailDocument,
  type EmailType,
} from '@builderset/email';
import { renderEmail } from '@builderset/email/render';
import { error, type Issue } from '@builderset/engine';
import {
  checkForm,
  createFormRegistry,
  isDraftBlocking as formDraftBlocks,
  isPublishBlocking as formPublishBlocks,
  parseForm,
  validateAnswers,
  type Answers,
  type FormDocument,
} from '@builderset/form';
import {
  checkPopup,
  createPopupRegistry,
  isDraftBlocking as popupDraftBlocks,
  isPublishBlocking as popupPublishBlocks,
  parsePopup,
  validateSubmission,
  type PopupDocument,
} from '@builderset/popup';

type Level = 'draft' | 'publish';
type Verdict = { ok: true; document: unknown } | { ok: false; issues: Issue[] };

/** The languages your project writes in: a document in another is refused. */
const LOCALES = ['en', 'sq'];

/** Your email types, by key: the variables a template for each may use. */
const EMAIL_TYPES: Record<string, EmailType> = {};

/** A request body larger than any real document is refused before it is parsed. */
const MAX_BODY = 2 * 1024 * 1024;

const registries = {
  email: createEmailRegistry(),
  article: createArticleRegistry(),
  form: createFormRegistry(),
  card: createCardRegistry(),
  popup: createPopupRegistry(),
};

function verdict(document: unknown, issues: Issue[], blocks: (issue: Issue) => boolean): Verdict {
  const blocking = issues.filter(blocks);
  if (document && blocking.length === 0) return { ok: true, document };
  return { ok: false, issues: blocking.length ? blocking : [error('document.malformed')] };
}

/** One function per kit: parse, check, and keep what blocks at this level. */
const CHECKS: Record<string, (raw: unknown, level: Level, type: string | null) => Verdict> = {
  email(raw, level, type) {
    const document = parseEmail(raw, registries.email);
    const spec = type ? (EMAIL_TYPES[type] ?? null) : null;
    const issues = checkEmail(raw as EmailDocument, registries.email, spec, { locales: LOCALES });
    return verdict(document, issues, level === 'draft' ? emailDraftBlocks : emailPublishBlocks);
  },
  article(raw, level) {
    const parsed = parseArticle(raw, registries.article);
    if (!parsed.doc) return { ok: false, issues: parsed.issues };
    const issues = checkArticle(parsed.doc, registries.article, { locales: LOCALES });
    return verdict(
      parsed.doc,
      issues,
      level === 'draft' ? articleDraftBlocks : articlePublishBlocks,
    );
  },
  form(raw, level) {
    const document = parseForm(raw, registries.form);
    const issues = checkForm(raw as FormDocument, registries.form, { locales: LOCALES });
    return verdict(document, issues, level === 'draft' ? formDraftBlocks : formPublishBlocks);
  },
  // A card's "publish" is approving it for print: `isPrintBlocking` is that level.
  card(raw, level) {
    const document = parseCard(raw, registries.card);
    const issues = checkCard(raw as CardDocument, registries.card, { locales: LOCALES });
    return verdict(document, issues, level === 'draft' ? cardDraftBlocks : cardPrintBlocks);
  },
  popup(raw, level) {
    const document = parsePopup(raw, registries.popup);
    const issues = checkPopup(raw as PopupDocument, registries.popup, { locales: LOCALES });
    return verdict(document, issues, level === 'draft' ? popupDraftBlocks : popupPublishBlocks);
  },
};

async function readJson(request: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) return null;
    chunks.push(chunk as Buffer);
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  void (async () => {
    if (request.method !== 'POST') return send(response, 405, { error: 'POST only' });
    const body = await readJson(request);
    if (!body) return send(response, 400, { error: 'A JSON object, under 2 MB.' });

    const [, route, kit] = (request.url ?? '').split('/');
    if (route === 'check' && kit && kit in CHECKS) {
      const level: Level = body.level === 'publish' ? 'publish' : 'draft';
      const type = typeof body.type === 'string' ? body.type : null;
      return send(response, 200, CHECKS[kit]!(body.document, level, type));
    }
    if (route === 'answers' && kit === 'form') {
      // Checked against the published form the caller passes, never a draft.
      const form = parseForm(body.form, registries.form);
      if (!form) return send(response, 400, { error: 'Not a form.' });
      return send(response, 200, validateAnswers(form, (body.answers ?? {}) as Answers));
    }
    if (route === 'answers' && kit === 'popup') {
      const popup = parsePopup(body.popup, registries.popup);
      if (!popup) return send(response, 400, { error: 'Not a popup.' });
      return send(response, 200, validateSubmission(popup, body.values ?? {}));
    }
    if (route === 'render' && kit === 'email') {
      // Sending renders the stored document, never HTML from the browser.
      const document = parseEmail(body.document, registries.email);
      if (!document || typeof body.assetBase !== 'string')
        return send(response, 400, { error: 'An email document and an assetBase.' });
      const assetBase = body.assetBase;
      const { subject, html, text } = renderEmail(document, {
        data: (body.data ?? {}) as Record<string, unknown>,
        locale: typeof body.locale === 'string' ? body.locale : undefined,
        assetUrl: (key) => new URL(key, assetBase).href,
      });
      return send(response, 200, { subject, html, text });
    }
    return send(response, 404, { error: 'No such route.' });
  })();
});

server.listen(Number(process.env.CHECKER_PORT ?? 4319), '127.0.0.1');
