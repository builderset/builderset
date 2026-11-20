<?php

namespace App\Http\Requests;

use App\Enums\CardDelivery;
use Closure;
use Illuminate\Validation\Rule;

/** POST /api/cards/:id/issues — `{ member_ref, data, delivery, valid_until }`. */
final class IssueCardRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'member_ref' => ['required', 'string', 'max:120'],
            // The fields filled in, by their path: { "member.name": "Arben Hoxha" }. The
            // paths have dots, so the values are checked here rather than with `data.*`.
            'data' => ['bail', 'required', 'array', 'max:50', function (string $attribute, array $data, Closure $fail): void {
                foreach ($data as $value) {
                    if ($value !== null && (! is_string($value) || mb_strlen($value) > 500)) {
                        $fail('Each field is a text of at most 500 characters.');
                    }
                }
            }],
            'delivery' => ['sometimes', Rule::enum(CardDelivery::class)],
            'valid_until' => ['nullable', 'date_format:Y-m-d'],
        ];
    }
}
