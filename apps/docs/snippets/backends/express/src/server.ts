import type { EngineDocument } from '@builderset/engine';
import express from 'express';

import { session, signedIn } from './auth';
import { errorHandler, notFound, oneOf } from './http';
import { articles } from './models/articles';
import { cardDesigns } from './models/cards';
import type { DocumentModel, DocumentRow } from './models/document';
import { emailTemplates } from './models/emails';
import { forms } from './models/forms';
import { SECTION_KITS } from './models/library';
import { popups } from './models/popups';
import { cardIssues } from './routes/cards';
import { emailDelivery, publicArticles } from './routes/delivery';
import { documentRouter } from './routes/documents';
import { formResponses, publicForms } from './routes/forms';
import { historyRouter } from './routes/history';
import { sectionsRouter, uploads } from './routes/library';
import { popupPause, publicPopups } from './routes/popups';
import { UPLOAD_DIR } from './storage';

const app = express();

// Behind a proxy (a load balancer, a PaaS), req.ip is the visitor's address
// only if Express trusts the proxy's X-Forwarded-For. One hop here.
app.set('trust proxy', 1);

// A document is JSON of any size until it is checked: refuse a body larger
// than any real document before it is parsed.
app.use(express.json({ limit: '2mb' }));
app.use(session);

// Visitors: no sign-in.
app.use('/api/public/forms', publicForms);
app.use('/api/public/articles', publicArticles);
app.use('/api/public/popups', publicPopups);
app.use(
  '/api/uploads',
  express.static(UPLOAD_DIR, { index: false, immutable: true, maxAge: '1y' }),
);

// Everything else is your team's.
app.use('/api', signedIn);
app.use('/api/uploads', uploads);
app.use('/api/forms', formResponses);
app.use('/api/emails', emailDelivery);
app.use('/api/cards', cardIssues);
app.use('/api/popups', popupPause);

/** The same routes for each builder: its library if it has one, its history, its documents. */
function mount<D extends EngineDocument, R extends DocumentRow<D>>(
  path: string,
  model: DocumentModel<D, R>,
) {
  // First, so /api/emails/sections is not read as a document's id. Cards and
  // popups keep no sections: /api/cards/sections is a 404, as any other id.
  if (oneOf(SECTION_KITS, model.kit)) app.use(`/api/${path}/sections`, sectionsRouter(model.kit));
  app.use(`/api/${path}`, historyRouter(model), documentRouter(model));
}
mount('emails', emailTemplates);
mount('articles', articles);
mount('forms', forms);
mount('cards', cardDesigns);
mount('popups', popups);

app.use('/api', () => {
  throw notFound('route');
});
app.use(errorHandler);

app.listen(Number(process.env.PORT ?? 3000));
