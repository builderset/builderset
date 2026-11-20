<?php

namespace App\Http\Requests;

/** POST /api/public/popups/:id/submissions — PopupView's onSubmit: `{ values, path, locale }`. */
final class SubmitPopupRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'values' => ['nullable', 'array'],
            'path' => ['nullable', 'string', 'max:500'],
            'locale' => ['nullable', 'string', 'max:10'],
        ];
    }
}
