<?php

namespace App\Http\Requests;

use App\Enums\DocumentKind;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The validation every body shares. Laravel's own input reads JSON objects
 * as PHP arrays, and trims and nulls their strings; a document must reach
 * the checks as it was sent, so `raw()` reads it from the raw body instead.
 */
abstract class ApiRequest extends FormRequest
{
    private mixed $body = null;

    /** One value of the JSON body as it was sent: objects stay objects, strings as typed. */
    public function raw(string $key): mixed
    {
        $this->body ??= json_decode($this->getContent() ?: 'null', false);

        return is_object($this->body) ? ($this->body->{$key} ?? null) : null;
    }

    /** The builder the URL names: /api/{kind}/…. */
    protected function kind(): DocumentKind
    {
        $kind = $this->route('kind');

        return $kind instanceof DocumentKind ? $kind : DocumentKind::from($kind);
    }
}
