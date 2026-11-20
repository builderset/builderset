<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

/**
 * What a route refuses, and how. bootstrap/app.php is the one place that
 * turns it into an answer: its status, its message, and the body the editor
 * reads — `issues` for a document, `errors` for a visitor's answers.
 */
final class ApiError extends RuntimeException
{
    private function __construct(
        public readonly int $status,
        string $message,
        public readonly array $body = [],
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    /** A stale save, a live document deleted, a member who already holds a card. */
    public static function conflict(string $message): self
    {
        return new self(409, $message);
    }

    /** A form closed or full, a popup paused or over. */
    public static function gone(string $message, array $body = []): self
    {
        return new self(410, $message, $body);
    }

    /** 422 with the issue codes, so the editor shows each problem on its block. */
    public static function refused(array $issues): self
    {
        return new self(422, 'Refused: see the issues.', ['issues' => $issues]);
    }

    /** 422 with what is wrong with each of a visitor's answers, by its name. */
    public static function invalidAnswers(object $errors): self
    {
        return new self(422, 'Some answers need another look.', ['errors' => $errors]);
    }

    public static function tooLarge(string $message): self
    {
        return new self(413, $message);
    }

    public static function unsupported(string $message): self
    {
        return new self(415, $message);
    }

    /** The checker did not answer. Nothing is stored unchecked. */
    public static function checkerUnavailable(Throwable $previous): self
    {
        return new self(503, 'The checks are not available. Try again in a moment.', [], $previous);
    }
}
