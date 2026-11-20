<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** An uploaded file, as the editor's upload reads it. The URL is built now; the document keeps the key. */
class MediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'key' => $this->key,
            'url' => Storage::disk('public')->url($this->key),
            'kind' => $this->kind,
            'mime' => $this->mime,
            'size' => $this->size,
            'width' => $this->width,
            'height' => $this->height,
            'name' => $this->name,
            'alt' => $this->alt,
        ];
    }
}
