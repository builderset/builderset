<?php

namespace App\Enums;

use App\Models\Article;
use App\Models\CardDesign;
use App\Models\Document;
use App\Models\EmailTemplate;
use App\Models\Form;
use App\Models\Popup;

/**
 * The five builders, as the URL names them: /api/{kind}/…. The shared routes
 * are written once and ask the kind for its model, its kit and its noun.
 */
enum DocumentKind: string
{
    case Emails = 'emails';
    case Articles = 'articles';
    case Forms = 'forms';
    case Cards = 'cards';
    case Popups = 'popups';

    /** @return class-string<Document> */
    public function model(): string
    {
        return match ($this) {
            self::Emails => EmailTemplate::class,
            self::Articles => Article::class,
            self::Forms => Form::class,
            self::Cards => CardDesign::class,
            self::Popups => Popup::class,
        };
    }

    /** The kit: its schema file, and its route on the checker. */
    public function kit(): string
    {
        return match ($this) {
            self::Emails => 'email',
            self::Articles => 'article',
            self::Forms => 'form',
            self::Cards => 'card',
            self::Popups => 'popup',
        };
    }

    /** What a message calls one: "this email template is live". */
    public function noun(): string
    {
        return match ($this) {
            self::Emails => 'email template',
            self::Articles => 'article',
            self::Forms => 'form',
            self::Cards => 'card design',
            self::Popups => 'popup',
        };
    }

    /** Whether it has a library of saved sections. Cards and popups place elements freely. */
    public function hasSections(): bool
    {
        return in_array($this, [self::Emails, self::Articles, self::Forms], true);
    }

    /** @return list<string> the values a route's {kind} may take */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** A live row by its public id; 404 when there is none. */
    public function find(string $uuid): Document
    {
        return $this->model()::query()->where('uuid', $uuid)->firstOrFail();
    }

    /** The same, locked until the transaction ends: what is checked is what is written. */
    public function findForUpdate(string $uuid): Document
    {
        return $this->model()::query()->where('uuid', $uuid)->lockForUpdate()->firstOrFail();
    }

    /** A deleted row, for restore: the only route that sees the trash. */
    public function findTrashedForUpdate(string $uuid): Document
    {
        return $this->model()::onlyTrashed()->where('uuid', $uuid)->lockForUpdate()->firstOrFail();
    }
}
