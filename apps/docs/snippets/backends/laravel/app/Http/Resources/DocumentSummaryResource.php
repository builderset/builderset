<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A line of your list of documents; in the trash, also when and by whom it was deleted. */
class DocumentSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'id' => $row->uuid,
            ...$row->only($row->listColumns()),
            'status' => $row->status,
            'saved_at' => $row->saved_at,
            'updated_at' => $row->updated_at,
            'updated_by' => $row->updatedBy?->asPerson(),
            $this->mergeWhen($row->trashed(), fn () => [
                'deleted_at' => $row->deleted_at,
                'deleted_by' => $row->deletedBy?->asPerson(),
            ]),
        ];
    }
}
