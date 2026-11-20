<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** One line of a timeline. `actor` is a person like every other: `{ id, name }`, or null. */
class ActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'action' => $this->action,
            'from_status' => $this->from_status,
            'to_status' => $this->to_status,
            'details' => $this->details,
            'actor' => $this->actor?->asPerson(),
            'created_at' => $this->created_at,
        ];
    }
}
