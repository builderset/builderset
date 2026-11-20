<?php

namespace App\Models\Concerns;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;

/**
 * The audit columns every table has. `id` is for joins and never leaves the
 * server; `uuid` is the only id in URLs and answers. Who made, changed and
 * deleted the row is the signed-in user, set here in the model's events and
 * never taken from a request. Deleting is a soft delete: SoftDeletes leaves
 * deleted rows out of every query that does not ask for them.
 */
trait Audited
{
    use HasUuids;
    use PreciseDates;
    use SoftDeletes;

    public static function bootAudited(): void
    {
        static::creating(function (self $row): void {
            $row->created_by_id ??= Auth::id();
            $row->updated_by_id ??= Auth::id();
        });
        // Null when a job changes it: nobody signed in did.
        static::updating(function (self $row): void {
            $row->updated_by_id = Auth::id();
        });
        static::restoring(function (self $row): void {
            $row->deleted_by_id = null;
        });
    }

    /** HasUuids fills `uuid`; the key stays the bigint `id`. */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /** Routes find a row by its uuid. A value that is not one finds nothing, without asking Postgres. */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /** SoftDeletes' own delete, which also says who deleted the row. */
    protected function runSoftDelete(): void
    {
        $columns = [
            $this->getDeletedAtColumn() => $this->fromDateTime($this->freshTimestamp()),
            'deleted_by_id' => Auth::id(),
            'updated_by_id' => Auth::id(),
        ];
        $this->setKeysForSaveQuery($this->newModelQuery())->update($columns);
        $this->forceFill($columns)->syncOriginal();
        $this->fireModelEvent('trashed', false);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_id');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by_id');
    }

    /** The relations that name a person. An answer shows each as `{ id, name }`, under its snake_case name. */
    public function people(): array
    {
        return ['createdBy', 'updatedBy', 'deletedBy'];
    }

    /** What happened to this row, newest first. The log names it by its table and id. */
    public function activity(): MorphMany
    {
        return $this->morphMany(Activity::class, 'subject')->latest()->latest('id');
    }
}
