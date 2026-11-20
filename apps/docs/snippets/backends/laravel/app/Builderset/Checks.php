<?php

namespace App\Builderset;

use App\Enums\DocumentKind;
use App\Exceptions\ApiError;

/**
 * Every document is checked here before it is stored: its shape against the
 * kit's JSON Schema, then the kit's own rules in the checker. A refusal is a
 * 422 with the issues, which the editor shows on their blocks.
 */
final class Checks
{
    public function __construct(
        private readonly Schemas $schemas,
        private readonly Checker $checker,
    ) {}

    /** The document to store: as the checker read it, which brings an older one up to date. */
    public function document(DocumentKind $kind, mixed $document, Level $level, ?string $type = null): object
    {
        if (! is_object($document)) {
            throw ApiError::refused([Issue::error('document.malformed')]);
        }
        $issues = $this->schemas->documentIssues($kind->kit(), $document);
        if ($issues !== []) {
            throw ApiError::refused($issues);
        }
        $verdict = $this->checker->check($kind->kit(), $document, $level, $type);
        if (! $verdict->ok) {
            throw ApiError::refused($verdict->issues);
        }

        return $verdict->document;
    }

    /**
     * A form's answers or a popup's values, against the PUBLISHED document.
     * Returns only what the kit keeps: answers to questions the visitor was
     * not shown, and anything the document does not ask, never reach a table.
     */
    public function answers(DocumentKind $kind, object $published, mixed $answers): object
    {
        $result = $this->checker->answers($kind->kit(), $published, is_object($answers) ? $answers : (object) []);
        if (! $result->ok) {
            throw ApiError::invalidAnswers($result->errors);
        }

        return $result->values;
    }

    /** A saved section: a fragment of the kit's own elements, or a 422. */
    public function fragment(DocumentKind $kind, mixed $fragment): object
    {
        $issues = is_object($fragment)
            ? $this->schemas->fragmentIssues($kind->kit(), $fragment)
            : [Issue::error('fragment.malformed', path: 'fragment')];
        if ($issues !== []) {
            throw ApiError::refused($issues);
        }

        return $fragment;
    }
}
