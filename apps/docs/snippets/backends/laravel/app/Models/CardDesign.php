<?php

namespace App\Models;

use App\Enums\DocumentKind;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A card design. `published` is the design new cards are made from. */
class CardDesign extends Document
{
    protected $table = 'card_design';

    protected function casts(): array
    {
        return [
            ...parent::casts(),
            'width_mm' => 'decimal:2',
            'height_mm' => 'decimal:2',
            'sides' => 'integer',
        ];
    }

    public static function kind(): DocumentKind
    {
        return DocumentKind::Cards;
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(CardDesignRevision::class);
    }

    public function issues(): HasMany
    {
        return $this->hasMany(CardIssue::class);
    }

    public function listColumns(): array
    {
        return ['name', 'format', 'sides'];
    }

    /** The root holds the card's format: its kind, its size in millimetres, its printed sides. */
    public function copiesOf(object $document): array
    {
        $format = $document->nodes->{$document->root}->props;

        return [
            'name' => mb_substr($document->meta->name, 0, 120),
            'format' => $format->format,
            'width_mm' => $format->width,
            'height_mm' => $format->height,
            'sides' => $format->sides,
        ];
    }
}
