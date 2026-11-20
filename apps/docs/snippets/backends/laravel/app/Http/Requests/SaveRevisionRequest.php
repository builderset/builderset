<?php

namespace App\Http\Requests;

/** POST /api/{kind}/:id/revisions — the editor's saveRevision: `{ document, label }`. */
final class SaveRevisionRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'document' => ['required', 'array'],
            'label' => ['nullable', 'string', 'max:120'],
        ];
    }
}
