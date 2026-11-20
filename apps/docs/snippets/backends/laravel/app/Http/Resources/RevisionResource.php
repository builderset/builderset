<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A revision in the editor's history panel. `author` is a name, which the panel shows as it is. */
class RevisionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'kind' => $this->kind,
            'label' => $this->label,
            'version' => $this->version,
            'created_at' => $this->created_at,
            'author' => $this->author?->name,
        ];
    }
}
