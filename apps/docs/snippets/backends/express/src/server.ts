import type { EngineDocument } from '@builderset/engine';
import express from 'express';

import { session, signedIn } from './auth';
import { errorHandler, notFound } from './http';
import { articles } from './models/articles';
import type { DocumentModel, DocumentRow } from './models/document';
import { emailTemplates } from './models/emails';
import { forms } from './models/forms';
import { emailDelivery, publicArticles } from './routes/delivery';
import { documentRouter } from './routes/documents';
import { formResponses, publicForms } from './routes/forms';
import { historyRouter } from './routes/history';
import { sectionsRouter, uploads } from './routes/library';
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
app.use(
  '/api/uploads',
  express.static(UPLOAD_DIR, { index: false, immutable: true, maxAge: '1y' }),
);

// Everything else is your team's.
app.use('/api', signedIn);
app.use('/api/uploads', uploads);
app.use('/api/forms', formResponses);
app.use('/api/emails', emailDelivery);

/** The same routes for each builder: its library, its history, its documents. */
function mount<D extends EngineDocument, R extends DocumentRow<D>>(
  path: string,
  model: DocumentModel<D, R>,
) {
  // First, so /api/emails/sections is not read as a document's id.
  app.use(`/api/${path}/sections`, sectionsRouter(model.kit));
  app.use(`/api/${path}`, historyRouter(model), documentRouter(model));
}
mount('emails', emailTemplates);
mount('articles', articles);
mount('forms', forms);

app.use('/api', () => {
  throw notFound('route');
});
app.use(errorHandler);

app.listen(Number(process.env.PORT ?? 3000));
