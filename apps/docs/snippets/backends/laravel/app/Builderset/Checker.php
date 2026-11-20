<?php

namespace App\Builderset;

use App\Exceptions\ApiError;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as Http;

/**
 * The second check: the kits' own rules — an unsafe link, a variable the
 * email type does not have, a form's answers — which only the kits' code
 * knows. They run in the Builderset checker, a small Node service beside
 * this app on a private port. When it does not answer, nothing is stored
 * unchecked: the route answers 503. The same service renders an email,
 * which is the kit's code too.
 */
final class Checker
{
    public function __construct(
        private readonly Http $http,
        private readonly string $url,
        private readonly float $timeout,
    ) {}

    /**
     * POST /check/{kit}: the document as the kit reads it, or the issues
     * that block it at this level.
     *
     * @return object{ok: bool, document?: object, issues?: list<object>}
     */
    public function check(string $kit, object $document, Level $level, ?string $type = null): object
    {
        return $this->post("/check/{$kit}", array_filter(
            ['document' => $document, 'level' => $level->value, 'type' => $type],
            fn ($value) => $value !== null,
        ));
    }

    /**
     * POST /answers/form or /answers/popup: what a visitor sent, checked
     * against the published document exactly as the browser checked it.
     *
     * @return object{ok: bool, errors: object, values: object}
     */
    public function answers(string $kit, object $document, object $answers): object
    {
        return match ($kit) {
            'form' => $this->post('/answers/form', ['form' => $document, 'answers' => $answers]),
            'popup' => $this->post('/answers/popup', ['popup' => $document, 'values' => $answers]),
        };
    }

    /**
     * POST /render/email: the stored email, rendered with the kit's
     * `renderEmail`. Uploaded files are linked under `$assetBase`.
     *
     * @return object{subject: string, html: string, text: string}
     */
    public function renderEmail(object $document, object $data, ?string $locale, string $assetBase): object
    {
        return $this->post('/render/email', array_filter(
            ['document' => $document, 'data' => $data, 'locale' => $locale, 'assetBase' => $assetBase],
            fn ($value) => $value !== null,
        ));
    }

    private function post(string $path, array $body): object
    {
        try {
            $response = $this->http
                ->baseUrl($this->url)
                ->timeout($this->timeout)
                ->connectTimeout(2)
                ->acceptJson()
                ->post($path, $body);
        } catch (ConnectionException $failure) {
            throw ApiError::checkerUnavailable($failure);
        }
        if (! $response->ok()) {
            throw ApiError::checkerUnavailable($response->toException());
        }

        // As objects, like the documents: an empty `{}` must stay one.
        return json_decode($response->body(), false, flags: JSON_THROW_ON_ERROR);
    }
}
