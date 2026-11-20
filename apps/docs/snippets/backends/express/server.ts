import express, { type NextFunction, type Request, type Response } from 'express';

import { articles, documentRouter, emails, forms } from './documents';
import { listResponses, publicForms } from './forms';

const app = express();

// Behind a proxy (a load balancer, a PaaS), req.ip is the visitor's address
// only if Express trusts the proxy's X-Forwarded-For. One hop here.
app.set('trust proxy', 1);

// A document is JSON of any size until it is checked: refuse a body that is
// larger than any real document before it is parsed.
app.use(express.json({ limit: '2mb' }));

// Visitors: no sign-in. Put a rate limit in front of the responses route
// (your proxy, or express-rate-limit), answering 429.
app.use('/api/public/forms', publicForms);

/**
 * Everything else is the editor's. Your session middleware (express-session,
 * Passport, a JWT check) runs first and puts the user on res.locals; who may
 * edit is your rule.
 */
function editorsOnly(_req: Request, res: Response, next: NextFunction) {
  if (!res.locals.user) {
    res.status(401).json({ message: 'Sign in to edit.' });
    return;
  }
  next();
}
app.use('/api', editorsOnly);

// A form's responses, for the editor's Responses tab.
app.get('/api/forms/:id/responses', listResponses);

// One router, three kinds: the same routes at /api/emails, /api/articles, /api/forms.
app.use('/api/emails', documentRouter(emails));
app.use('/api/articles', documentRouter(articles));
app.use('/api/forms', documentRouter(forms));

app.listen(Number(process.env.PORT ?? 3000));
