<?php

namespace App\Models;

use App\Builderset\Issue;
use App\Enums\Action;
use App\Enums\DocumentKind;
use App\Enums\Status;
use App\Exceptions\ApiError;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Str;

/** A form, at example.com/f/<slug>. Unpublishing closes it: its link keeps working. */
class Form extends Document
{
    protected $table = 'form';

    protected function casts(): array
    {
        return [...parent::casts(), 'response_count' => 'integer', 'closed_at' => 'datetime'];
    }

    public static function kind(): DocumentKind
    {
        return DocumentKind::Forms;
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(FormRevision::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(FormResponse::class);
    }

    public function listColumns(): array
    {
        return ['name', 'slug', 'response_count'];
    }

    public function copiesOf(object $document): array
    {
        return ['name' => mb_substr($document->meta->name, 0, 120)];
    }

    /** The slug is unique and required, and a new form has none yet. */
    public function fillNew(array $input): void
    {
        $this->slug = 'draft-'.Str::uuid();
    }

    /** Publishing is when a form takes its real address. The unique index makes sure it is free. */
    public function applyPublish(object $document, ?CarbonInterface $scheduledAt): Action
    {
        $slug = trim($document->meta->slug ?? '');
        if ($slug === '') {
            throw ApiError::refused([Issue::error('meta.slugMissing', path: 'meta.slug')]);
        }
        $this->slug = $slug;
        $this->closed_at = null;
        $this->closed_by_id = null;

        return parent::applyPublish($document, $scheduledAt);
    }

    /** A closed form keeps its link and shows its closed message. */
    public function applyUnpublish(): Action
    {
        $this->status = Status::Closed;
        $this->closed_at = Date::now();
        $this->closed_by_id = Auth::id();

        return Action::Closed;
    }

    /** The form a visitor sees at its address: published, or closed with its message. */
    public static function findPublic(string $slug): self
    {
        return static::query()
            ->where('slug', $slug)
            ->whereIn('status', [Status::Published, Status::Closed])
            ->firstOrFail();
    }

    /** Whether it takes no responses now: closed by hand, full, or outside its dates. */
    public function isClosedNow(): bool
    {
        $limits = $this->document->settings->limits;
        $now = Date::now();

        return $this->status === Status::Closed
            || ($limits->maxResponses !== null && $this->response_count >= $limits->maxResponses)
            || ($limits->opensAt !== null && Date::parse($limits->opensAt)->isAfter($now))
            || ($limits->closesAt !== null && Date::parse($limits->closesAt)->lessThanOrEqualTo($now));
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_id');
    }

    public function people(): array
    {
        return [...parent::people(), 'closedBy'];
    }
}
