<?php

namespace App\Models;

use App\Enums\CardDelivery;
use App\Enums\CardIssueStatus;
use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One card made out to one member. The design's version and the member's
 * data are frozen when it is issued, so a reprint matches the card in their
 * hand. `created_at` is when it was issued.
 */
class CardIssue extends Model
{
    use Audited;

    protected $table = 'card_issue';

    protected $guarded = [];

    protected $attributes = ['status' => 'issued', 'delivery' => 'print'];

    protected function casts(): array
    {
        return [
            'design_version' => 'integer',
            // The fields filled in: { "member.name": "Arben Hoxha" }.
            'data' => 'object',
            'status' => CardIssueStatus::class,
            'delivery' => CardDelivery::class,
            'valid_until' => 'date:Y-m-d',
            'printed_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /**
     * A new card number: twelve random digits, in fours. The unique index
     * refuses a repeat, even of a revoked card's. Your own numbering — a
     * sequence, a check digit — goes here.
     */
    public static function newNumber(): string
    {
        return implode(' ', array_map(
            fn (): string => sprintf('%04d', random_int(0, 9999)),
            range(1, 3),
        ));
    }

    public function design(): BelongsTo
    {
        return $this->belongsTo(CardDesign::class, 'card_design_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_id');
    }

    public function people(): array
    {
        return ['createdBy', 'updatedBy', 'deletedBy', 'revokedBy'];
    }
}
