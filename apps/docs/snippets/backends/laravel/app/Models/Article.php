<?php

namespace App\Models;

use App\Enums\Action;
use App\Enums\DocumentKind;
use App\Enums\Status;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;

/** One page of your blog or help centre, in one language, at its address. */
class Article extends Document
{
    protected $table = 'article';

    protected function casts(): array
    {
        return [...parent::casts(), 'scheduled_at' => 'datetime'];
    }

    public static function kind(): DocumentKind
    {
        return DocumentKind::Articles;
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(ArticleRevision::class);
    }

    public function listColumns(): array
    {
        return ['title', 'slug', 'locale', 'scheduled_at'];
    }

    public function copiesOf(object $document): array
    {
        $meta = $document->meta;

        return [
            'title' => mb_substr($meta->title, 0, 300),
            'excerpt' => mb_substr($meta->excerpt ?? '', 0, 600),
            'cover_key' => $meta->cover->media->key ?? null,
            'cover_alt' => $meta->cover->alt ?? null,
        ];
    }

    /** The address is the article's, not the document's: chosen when it is made. */
    public function fillNew(array $input): void
    {
        $this->slug = $input['slug'];
        $this->locale = $input['locale'];
        $this->author_id = Auth::id();
    }

    /**
     * A future `scheduled_at` waits for a job of yours. Publishing now keeps
     * the first `published_at`, which the site's list sorts by.
     */
    public function applyPublish(object $document, ?CarbonInterface $scheduledAt): Action
    {
        if ($scheduledAt !== null) {
            $this->status = Status::Scheduled;
            $this->scheduled_at = $scheduledAt;

            return Action::Scheduled;
        }
        $this->status = Status::Published;
        $this->scheduled_at = null;
        $this->published_at ??= Date::now();

        return Action::Published;
    }

    public function applyUnpublish(): Action
    {
        $this->status = Status::Draft;
        $this->scheduled_at = null;

        return Action::Unpublished;
    }

    /** The byline: not always who created the row. */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function people(): array
    {
        return [...parent::people(), 'author'];
    }
}
