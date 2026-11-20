<?php

namespace App\Services;

use App\Builderset\Checks;
use App\Builderset\Issue;
use App\Builderset\Level;
use App\Enums\Action;
use App\Enums\DocumentKind;
use App\Enums\RevisionKind;
use App\Enums\Status;
use App\Exceptions\ApiError;
use App\Models\Activity;
use App\Models\Document;
use Carbon\CarbonInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * What every write to a document does, for all five builders: check the
 * document, write the row with who did it, keep a revision on a manual save
 * or a publish, and append an activity line — the last three in one
 * transaction. The checker is asked before the transaction starts, so no row
 * stays locked while it answers.
 */
final class Documents
{
    /** The columns a rename changes, logged with what they were. */
    private const RENAMEABLE = ['name', 'title', 'slug'];

    public function __construct(private readonly Checks $checks) {}

    /** POST /api/{kind} — a new document, as a draft. */
    public function create(DocumentKind $kind, array $input, mixed $document): Document
    {
        $row = new ($kind->model());
        $row->fillNew($input);
        $checked = $this->checks->document($kind, $document, Level::Draft, $row->checkerType());

        try {
            return DB::transaction(function () use ($row, $checked): Document {
                $row->forceFill([...$row->copiesOf($checked), 'document' => $checked]);
                $row->touchSavedAt();
                $row->save();
                Activity::log($row, Action::Created, to: $row->status);

                return $row;
            });
        } catch (UniqueConstraintViolationException) {
            // Only an article chooses its address when it is made: another live one has it.
            throw ApiError::refused([Issue::error('slug.taken', path: 'slug')]);
        }
    }

    // #region draft
    /**
     * PUT /api/{kind}/:id/draft — an autosave or a manual save; readers still
     * get the live document. The editor sends back the saved_at it last saw:
     * the row is locked before it is compared, so two saves at the same
     * moment cannot both win. Without one, only "keep mine" (`force`) saves.
     */
    public function saveDraft(
        DocumentKind $kind,
        string $id,
        mixed $document,
        ?CarbonInterface $expectedSavedAt,
        bool $force,
        bool $manual,
    ): CarbonInterface {
        $row = $kind->find($id);
        $checked = $this->checks->document($kind, $document, Level::Draft, $row->checkerType());

        return DB::transaction(function () use ($kind, $id, $checked, $expectedSavedAt, $force, $manual) {
            $row = $kind->findForUpdate($id);
            $stale = $expectedSavedAt === null
                || $expectedSavedAt->getTimestampMs() !== $row->saved_at->getTimestampMs();
            if ($stale && ! $force) {
                throw ApiError::conflict("Someone else saved this {$kind->noun()} since you opened it.");
            }

            $row->draft_document = $checked;
            $row->touchSavedAt();
            $row->save();

            if ($manual) {
                $revision = $row->keepRevision(RevisionKind::Manual, $checked);
                Activity::log($row, Action::Saved, details: ['revision' => $revision->uuid]);
            } else {
                // Autosaves are not logged: a revision now and then is enough.
                $row->keepAutosave($checked);
            }

            return $row->saved_at;
        });
    }
    // #endregion

    // #region publish
    /**
     * POST /api/{kind}/:id/publish — the strict check, then the document goes
     * live with its meta copied to the columns, its version counted, a
     * `publish` revision and its activity line.
     */
    public function publish(Document $row, mixed $document, ?CarbonInterface $scheduledAt): Document
    {
        $kind = $row::kind();
        $checked = $this->checks->document($kind, $document, Level::Publish, $row->checkerType());
        $scheduledAt = $scheduledAt?->isFuture() ? $scheduledAt : null;

        try {
            return DB::transaction(function () use ($kind, $row, $checked, $scheduledAt): Document {
                $row = $kind->findForUpdate($row->uuid);
                $from = $row->status;
                $row->beforePublish();
                $action = $row->applyPublish($checked, $scheduledAt);
                $row->forceFill([
                    ...$row->copiesOf($checked),
                    'document' => $checked,
                    'draft_document' => null,
                    'version' => $row->version + 1,
                    'published_by_id' => Auth::id(),
                ]);
                $row->touchSavedAt();
                $renamed = $this->renames($row);
                $row->save();

                $revision = $row->keepRevision(RevisionKind::Publish, $checked);
                Activity::log($row, $action, $from, $row->status, [
                    'revision' => $revision->uuid,
                    'version' => $row->version,
                ]);
                if ($renamed !== []) {
                    Activity::log($row, Action::Renamed, details: $renamed);
                }

                return $row;
            });
        } catch (UniqueConstraintViolationException) {
            // Only a form's address can collide on publish: show it on meta.slug, where the editor edits it.
            throw ApiError::refused([Issue::error('meta.slugTaken', path: 'meta.slug')]);
        }
    }
    // #endregion

    /** POST /api/{kind}/:id/unpublish — readers no longer get it; the document and its saved_at stay. */
    public function unpublish(Document $row): Document
    {
        return DB::transaction(function () use ($row): Document {
            $row = $row::kind()->findForUpdate($row->uuid);
            if (! $row->status->isUnpublishable()) {
                return $row;
            }
            $from = $row->status;
            $action = $row->applyUnpublish();
            $row->save();
            Activity::log($row, $action, $from, $row->status);

            return $row;
        });
    }

    // #region delete
    /** DELETE /api/{kind}/:id — a soft delete. A live document is refused: unpublish it first. */
    public function delete(DocumentKind $kind, string $id): void
    {
        DB::transaction(function () use ($kind, $id): void {
            $row = $kind->findForUpdate($id);
            if ($row->status === Status::Published) {
                throw ApiError::conflict("This {$kind->noun()} is live: unpublish it before deleting it.");
            }
            $row->delete();
            Activity::log($row, Action::Deleted, from: $row->status);
        });
    }

    /**
     * POST /api/{kind}/:id/restore — out of the trash. When another live row
     * took its address meanwhile, the partial unique index refuses it, and
     * bootstrap/app.php answers 409.
     */
    public function restore(DocumentKind $kind, string $id): Document
    {
        return DB::transaction(function () use ($kind, $id): Document {
            $row = $kind->findTrashedForUpdate($id);
            $row->restore();
            Activity::log($row, Action::Restored, to: $row->status);

            return $row;
        });
    }
    // #endregion

    /** POST /api/{kind}/:id/revisions — the editor's saveRevision: a version someone named. */
    public function saveRevision(Document $row, mixed $document, ?string $label): string
    {
        $kind = $row::kind();
        $checked = $this->checks->document($kind, $document, Level::Draft, $row->checkerType());

        return DB::transaction(function () use ($row, $checked, $label): string {
            $revision = $row->keepRevision(RevisionKind::Manual, $checked, $label);
            Activity::log($row, Action::Saved, details: ['revision' => $revision->uuid, 'label' => $label]);

            return $revision->uuid;
        });
    }

    /** The name, title or slug a publish is about to change: `{ slug: { from, to } }`. */
    private function renames(Document $row): array
    {
        $renamed = [];
        foreach (self::RENAMEABLE as $column) {
            if ($row->isDirty($column) && $row->getOriginal($column) !== null) {
                $renamed[$column] = ['from' => $row->getOriginal($column), 'to' => $row->{$column}];
            }
        }

        return $renamed;
    }
}
