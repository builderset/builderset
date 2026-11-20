<?php

namespace App\Http\Controllers;

use App\Enums\DocumentKind;
use App\Http\Requests\SaveRevisionRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\RevisionResource;
use App\Services\Documents;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * A document's two histories: its revisions (what it said) and its activity
 * (what happened to it). A deleted document has neither: 404, as everywhere.
 */
final class HistoryController extends Controller
{
    /** GET /api/{kind}/:id/revisions — the editor's loadRevisions, newest first. */
    public function index(DocumentKind $kind, string $id): AnonymousResourceCollection
    {
        $revisions = $kind->find($id)->revisions()
            ->with('author:id,name')
            ->orderByDesc('created_at')->orderByDesc('id')
            ->limit(100)
            ->get();

        return RevisionResource::collection($revisions);
    }

    /** GET /api/{kind}/:id/revisions/:rid — the editor's loadRevision. */
    public function show(DocumentKind $kind, string $id, string $revision): array
    {
        $found = $kind->find($id)->revisions()->where('uuid', $revision)->firstOrFail();

        return ['document' => $found->document];
    }

    /** POST /api/{kind}/:id/revisions — the editor's saveRevision. */
    public function store(SaveRevisionRequest $request, Documents $documents, DocumentKind $kind, string $id): JsonResponse
    {
        $uuid = $documents->saveRevision($kind->find($id), $request->raw('document'), $request->validated('label'));

        return response()->json(['id' => $uuid], 201);
    }

    /** GET /api/{kind}/:id/activity — the document's timeline, for a History panel of yours. */
    public function activity(Request $request, DocumentKind $kind, string $id): AnonymousResourceCollection
    {
        $lines = $kind->find($id)->activity()
            ->with('actor:id,uuid,name')
            ->limit($this->page($request)['limit'])
            ->get();

        return ActivityResource::collection($lines);
    }
}
