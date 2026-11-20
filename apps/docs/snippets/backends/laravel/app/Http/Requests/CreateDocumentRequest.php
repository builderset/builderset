<?php

namespace App\Http\Requests;

use App\Enums\DocumentKind;
use Illuminate\Validation\Rule;

/** POST /api/{kind}: `{ document }`, and an article's `slug` and `locale`, an email's `type_key`. */
final class CreateDocumentRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'document' => ['required', 'array'],
            ...match ($this->kind()) {
                DocumentKind::Articles => [
                    'slug' => ['required', 'string', 'max:200', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
                    'locale' => ['required', 'string', 'regex:/^[a-z]{2}(?:-[A-Z]{2})?$/'],
                ],
                // Only a type the project has: its key picks the variables checked.
                DocumentKind::Emails => [
                    'type_key' => ['nullable', 'string', Rule::in(config('builderset.email_types'))],
                ],
                default => [],
            },
        ];
    }
}
