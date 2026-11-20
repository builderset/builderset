<?php

namespace App\Http\Requests;

/** POST /api/{kind}/sections — the editor's saveSection: `{ name, fragment }`. */
final class SaveSectionRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'fragment' => ['required', 'array'],
        ];
    }
}
