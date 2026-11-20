<?php

namespace App\Http\Requests;

/** POST /api/{kind}/:id/publish — `{ document, scheduled_at }`. */
final class PublishRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'document' => ['required', 'array'],
            'scheduled_at' => ['nullable', 'date'],
        ];
    }
}
