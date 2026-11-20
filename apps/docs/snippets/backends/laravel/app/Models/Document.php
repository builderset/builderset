<?php

namespace App\Models;

use App\Enums\Action;
use App\Enums\DocumentKind;
use App\Enums\RevisionKind;
use App\Enums\Status;
use App\Models\Concerns\Audited;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Date;

/**
 * What the five document tables share: the live document, the draft since,
 * and the two clocks. `updated_at` follows any change to the row; `saved_at`
 * only a write of the document, and is what the editor sends back to catch a
 * stale save. Each builder's model says what is its own: the copies of its
 * meta, and where publishing and unpublishing leave it.
 */
abstract class Document extends Model
{
    use Audited;

    /** Rows are filled from arrays this code builds, never from a request body as it came. */
    protected $guarded = [];

    /** A new row is a draft. Postgres has the same defaults; these are for the first answer. */
    protected $attributes = ['status' => 'draft', 'version' => 0];

    protected function casts(): array
    {
        return [
            // Objects, not arrays: a PHP array cannot tell the JSON `{}` from `[]`.
            'document' => 'object',
            'draft_document' => 'object',
            'status' => Status::class,
            'version' => 'integer',
            'saved_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    abstract public static function kind(): DocumentKind;

    abstract public function revisions(): HasMany;

    /** Copies of the document's meta, written with it: lists and search never read inside the JSON. */
    abstract public function copiesOf(object $document): array;

    /** What your list shows besides the shared columns. The first is what `?q=` searches. */
    public function listColumns(): array
    {
        return ['name'];
    }

    /** What a new row takes from the request besides its document, already validated. */
    public function fillNew(array $input): void {}

    /** The `type` the checker holds the document to: an email's type. */
    public function checkerType(): ?string
    {
        return null;
    }

    /** Anything else a publish changes, in the same transaction, before the row is written. */
    public function beforePublish(): void {}

    /** Where publishing leaves the row. Returns what the activity log calls it. */
    public function applyPublish(object $document, ?CarbonInterface $scheduledAt): Action
    {
        $this->status = Status::Published;
        $this->published_at = Date::now();

        return Action::Published;
    }

    /** Where unpublishing leaves it. The document is kept, and so is saved_at. */
    public function applyUnpublish(): Action
    {
        $this->status = Status::Draft;

        return Action::Unpublished;
    }

    /** The document was written: the new conflict token, to the millisecond the column keeps. */
    public function touchSavedAt(): void
    {
        $this->saved_at = Date::now()->startOfMillisecond();
    }

    /** Keep a version of the document, at the row's current version. */
    public function keepRevision(RevisionKind $kind, object $document, ?string $label = null): Revision
    {
        return $this->revisions()->create([
            'kind' => $kind,
            'label' => $label,
            'version' => $this->version,
            'document' => $document,
        ]);
    }

    /**
     * An autosave becomes a revision at most every ten minutes: enough to go
     * back to, without a whole document every few seconds of typing.
     */
    public function keepAutosave(object $document): void
    {
        $recent = $this->revisions()
            ->where('kind', RevisionKind::Autosave)
            ->where('created_at', '>', Date::now()->subMinutes(10))
            ->exists();
        if (! $recent) {
            $this->keepRevision(RevisionKind::Autosave, $document);
        }
    }

    public function publishedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by_id');
    }

    public function people(): array
    {
        return ['createdBy', 'updatedBy', 'deletedBy', 'publishedBy'];
    }
}
