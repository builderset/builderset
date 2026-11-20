// The documents function: every route of the data model for your team, one
// Edge Function. {kind} is emails, articles, forms, cards or popups; :id is
// a row's uuid.
// Deploy it with `supabase functions deploy documents`.
import { requireMember, requirePublisher } from '../_shared/auth.ts';
import {
  answerError,
  cors,
  matchPath,
  notFound,
  readJson,
  segmentsAfter,
  type Json,
} from '../_shared/http.ts';
import type { Call } from './call.ts';
import * as cards from './cards.ts';
import * as documents from './documents.ts';
import * as history from './history.ts';
import { kindOf } from './kinds.ts';
import * as library from './library.ts';
import * as popups from './popups.ts';
import * as responses from './responses.ts';

interface Route {
  method: string;
  path: string;
  handle: (call: Call) => Promise<Response>;
  /** Publishing, unpublishing and pausing need the `publisher` role. */
  publisher?: boolean;
}

// The first route that matches answers, so `uploads` comes before the `:kind`
// that would take it. An `:id` matches only a uuid: `sections` is never one.
const ROUTES: Route[] = [
  { method: 'POST', path: 'uploads', handle: library.upload },

  { method: 'GET', path: ':kind', handle: documents.list },
  { method: 'POST', path: ':kind', handle: documents.create },
  { method: 'GET', path: ':kind/:id', handle: documents.get },
  { method: 'DELETE', path: ':kind/:id', handle: documents.remove },
  { method: 'PUT', path: ':kind/:id/draft', handle: documents.saveDraft },
  { method: 'POST', path: ':kind/:id/publish', handle: documents.publish, publisher: true },
  { method: 'POST', path: ':kind/:id/unpublish', handle: documents.unpublish, publisher: true },
  { method: 'POST', path: ':kind/:id/restore', handle: documents.restoreFromTrash },

  { method: 'GET', path: ':kind/:id/revisions', handle: history.listRevisions },
  { method: 'POST', path: ':kind/:id/revisions', handle: history.saveRevision },
  { method: 'GET', path: ':kind/:id/revisions/:revisionId', handle: history.getRevision },
  { method: 'GET', path: ':kind/:id/activity', handle: history.activity },

  { method: 'GET', path: ':kind/sections', handle: library.listSections },
  { method: 'POST', path: ':kind/sections', handle: library.saveSection },
  { method: 'DELETE', path: ':kind/sections/:sectionId', handle: library.deleteSection },

  { method: 'GET', path: 'forms/:id/responses', handle: responses.summary },
  { method: 'PATCH', path: 'forms/:id/responses/:responseId', handle: responses.triage },
  { method: 'DELETE', path: 'forms/:id/responses/:responseId', handle: responses.remove },

  { method: 'GET', path: 'cards/:id/issues', handle: cards.listIssues },
  { method: 'POST', path: 'cards/:id/issues', handle: cards.issueCard },
  { method: 'GET', path: 'cards/:id/issues/:issueId', handle: cards.getIssue },
  { method: 'POST', path: 'cards/:id/issues/:issueId/revoke', handle: cards.revokeIssue },

  { method: 'PATCH', path: 'popups/:id/pause', handle: popups.pause, publisher: true },
];

/** A file comes as multipart and is read by its route; everything else is JSON. */
const bodyOf = (request: Request): Promise<Json> =>
  request.method === 'GET' || request.headers.get('Content-Type')?.startsWith('multipart/')
    ? Promise.resolve({})
    : readJson(request);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const segments = segmentsAfter(request, 'documents');
    for (const route of ROUTES) {
      const params = route.method === request.method ? matchPath(route.path, segments) : null;
      if (!params) continue;
      const member = await requireMember(request);
      if (route.publisher) requirePublisher(member);
      const call: Call = {
        request,
        member,
        params,
        query: new URL(request.url).searchParams,
        body: await bodyOf(request),
        get kind() {
          return kindOf(params.kind ?? '');
        },
      };
      return await route.handle(call);
    }
    throw notFound();
  } catch (error) {
    return answerError(error);
  }
});
