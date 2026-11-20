<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * A row as the API shows it: its uuid as `id`, no internal id at all, and
 * each person as `{ id, name }` — or null, for a job, a visitor, or someone
 * since removed. Documents, responses and card issues all answer this way.
 */
class RowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $row = $this->resource;
        $row->loadMissing(array_map(fn (string $relation) => "{$relation}:id,uuid,name", $row->people()));

        $columns = array_filter(
            $row->attributesToArray(),
            fn (string $column) => $column !== 'id' && $column !== 'uuid' && ! str_ends_with($column, '_id'),
            ARRAY_FILTER_USE_KEY,
        );
        $people = [];
        foreach ($row->people() as $relation) {
            $people[Str::snake($relation)] = $row->getRelation($relation)?->asPerson();
        }

        return ['id' => $row->uuid, ...$columns, ...$people];
    }
}
