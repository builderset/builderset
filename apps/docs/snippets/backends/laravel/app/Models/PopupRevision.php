<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PopupRevision extends Revision
{
    protected $table = 'popup_revision';

    public function popup(): BelongsTo
    {
        return $this->belongsTo(Popup::class);
    }
}
