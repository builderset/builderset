<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** POST /api/uploads — the editor's upload: multipart `file` and `kind`. */
final class UploadRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'file' => ['required', 'file'],
            'kind' => ['required', Rule::in(['image', 'video', 'audio', 'file'])],
        ];
    }
}
