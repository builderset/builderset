<?php

namespace App\Models;

use App\Enums\Action;
use App\Models\Concerns\PreciseDates;
use BackedEnum;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Auth;

/**
 * What happened to a row, who did it, and when. One table for every kind of
 * row, named by its table (the morph map in AppServiceProvider) and id, with
 * no foreign key, so the log outlives what it describes. Appended in the same
 * transaction as what it records, and never edited.
 */
class Activity extends Model
{
    use HasUuids;
    use PreciseDates;

    public const UPDATED_AT = null;

    protected $table = 'activity';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'action' => Action::class,
            // What else matters: the revision written, the old slug.
            'details' => 'object',
        ];
    }

    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /**
     * Append one line about `$subject`, by the signed-in user. Null when a job
     * or a visitor did it.
     */
    public static function log(
        Model $subject,
        Action $action,
        BackedEnum|string|null $from = null,
        BackedEnum|string|null $to = null,
        array $details = [],
    ): self {
        return $subject->activity()->create([
            'action' => $action,
            'from_status' => $from instanceof BackedEnum ? $from->value : $from,
            'to_status' => $to instanceof BackedEnum ? $to->value : $to,
            'details' => (object) $details,
            'actor_id' => Auth::id(),
        ]);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /** Who did it; null for a job, or someone since removed. */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
