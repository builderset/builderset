<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** PUT /api/{kind}/:id/draft — the editor's save: `{ document, reason, expected_saved_at, force }`. */
final class SaveDraftRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'document' => ['required', 'array'],
            'reason' => ['nullable', Rule::in(['autosave', 'manual'])],
            'expected_saved_at' => ['nullable', 'date'],
            'force' => ['boolean'],
        ];
    }

    /** A manual save keeps a revision and is logged; an autosave is neither. */
    public function isManual(): bool
    {
        return $this->input('reason') === 'manual';
    }
}
