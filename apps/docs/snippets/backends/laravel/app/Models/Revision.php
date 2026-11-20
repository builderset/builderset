<?php

namespace App\Models;

use App\Enums\RevisionKind;
use App\Models\Concerns\PreciseDates;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * A version of a document. Written once and never changed, so it has no
 * updated_* or deleted_*: restoring one writes a new one.
 */
abstract class Revision extends Model
{
    use HasUuids;
    use PreciseDates;

    public const UPDATED_AT = null;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'kind' => RevisionKind::class,
            'version' => 'integer',
            'document' => 'object',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $revision): void {
            $revision->created_by_id ??= Auth::id();
        });
    }

    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** Whose work it is. The editor's history panel shows their name. */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
