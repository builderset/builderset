<?php

namespace App\Http\Requests;

/**
 * POST /api/public/forms/:slug/responses — FormView's onSubmit:
 * `{ answers, locale, trap }`. The answers themselves are the checker's to
 * judge, against the published form.
 */
final class SubmitFormRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'answers' => ['nullable', 'array'],
            'locale' => ['nullable', 'string', 'max:10'],
            'trap' => ['nullable', 'string'],
        ];
    }

    /** The hidden field only bots fill in. */
    public function isTrapped(): bool
    {
        return filled($this->input('trap'));
    }
}
