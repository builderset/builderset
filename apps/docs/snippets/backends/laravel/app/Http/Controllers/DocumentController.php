<?php

namespace App\Http\Controllers;

use App\Enums\DocumentKind;
use App\Enums\Status;
use App\Http\Requests\CreateDocumentRequest;
use App\Http\Requests\PublishRequest;
use App\Http\Requests\SaveDraftRequest;
use App\Http\Resources\DocumentSummaryResource;
use App\Http\Resources\RowResource;
use App\Models\Article;
use App\Services\Documents;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The routes every builder shares, written once: /api/emails, /api/articles,
 * /api/forms, /api/cards and /api/popups differ only in their kind. Each
 * method reads the request and answers; the work is in Documents.
 */
final class DocumentController extends Controller
{
    public function __construct(private readonly Documents $documents) {}

    /** GET /api/{kind} — `?status=&q=&deleted=true&limit=&offset=`, newest change first. */
    public function index(Request $request, DocumentKind $kind): array
    {
        $searched = (new ($kind->model()))->listColumns()[0];
        $query = $kind->model()::query()
            ->when($request->boolean('deleted'), fn (Builder $query) => $query->onlyTrashed())
            ->when(Status::tryFrom($request->string('status')->value()), fn (Builder $query, Status $status) => $query->where('status', $status))
            ->when($request->string('q')->trim()->value(), fn (Builder $query, string $q) => $query->whereLike($searched, '%'.addcslashes($q, '\\%_').'%'));
        ['limit' => $limit, 'offset' => $offset] = $this->page($request);

        return [
            'items' => DocumentSummaryResource::collection($query->clone()
                ->with(['updatedBy:id,uuid,name', 'deletedBy:id,uuid,name'])
                ->orderByDesc('updated_at')->orderByDesc('id')
                ->offset($offset)->limit($limit)->get()),
            'total' => $query->count(),
        ];
    }

    /** POST /api/{kind} — your "New". */
    public function store(CreateDocumentRequest $request, DocumentKind $kind): JsonResponse
    {
        $row = $this->documents->create($kind, $request->validated(), $request->raw('document'));

        return (new RowResource($row))->response()->setStatusCode(201);
    }

    /** GET /api/{kind}/:id — the editor's reload. */
    public function show(DocumentKind $kind, string $id): RowResource
    {
        return new RowResource($kind->find($id));
    }

    /** PUT /api/{kind}/:id/draft — the editor's save. */
    public function saveDraft(SaveDraftRequest $request, DocumentKind $kind, string $id): array
    {
        $savedAt = $this->documents->saveDraft(
            $kind,
            $id,
            $request->raw('document'),
            $request->date('expected_saved_at'),
            $request->boolean('force'),
            $request->isManual(),
        );

        return ['saved_at' => $savedAt];
    }

    /** POST /api/{kind}/:id/publish — the editor's publish. Publishing is its own permission. */
    public function publish(PublishRequest $request, DocumentKind $kind, string $id): array
    {
        $row = $kind->find($id);
        Gate::authorize('publish', $row);
        $row = $this->documents->publish($row, $request->raw('document'), $request->date('scheduled_at'));

        return [
            'saved_at' => $row->saved_at,
            'status' => $row->status,
            'published_at' => $row->published_at,
            // An article also says when it goes live, when it is scheduled.
            ...($row instanceof Article ? ['scheduled_at' => $row->scheduled_at] : []),
        ];
    }

    /** POST /api/{kind}/:id/unpublish — the editor's unpublish. */
    public function unpublish(DocumentKind $kind, string $id): array
    {
        $row = $kind->find($id);
        Gate::authorize('publish', $row);
        $row = $this->documents->unpublish($row);

        return ['saved_at' => $row->saved_at, 'status' => $row->status];
    }

    /** DELETE /api/{kind}/:id — into the trash. */
    public function destroy(DocumentKind $kind, string $id): Response
    {
        $this->documents->delete($kind, $id);

        return response()->noContent();
    }

    /** POST /api/{kind}/:id/restore — out of the trash. */
    public function restore(DocumentKind $kind, string $id): RowResource
    {
        return new RowResource($this->documents->restore($kind, $id));
    }
}
