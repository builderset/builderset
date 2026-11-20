<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A version of a card design. A card issue finds the one it was printed from by its version. */
class CardDesignRevision extends Revision
{
    protected $table = 'card_design_revision';

    public function cardDesign(): BelongsTo
    {
        return $this->belongsTo(CardDesign::class);
    }
}
