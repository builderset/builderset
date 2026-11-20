<?php

namespace App\Http\Requests;

use App\Models\FormResponse;
use Illuminate\Validation\Rule;

/** PATCH /api/forms/:id/responses/:rid — your team's triage: `{ status, note }`, either or both. */
final class TriageResponseRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::in(FormResponse::STATUSES)],
            'note' => ['sometimes', 'nullable', 'string', 'max:4000'],
        ];
    }
}
