<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** What a visitor typed into a popup's inputs: the checker's values only, never the raw body. */
class PopupSubmission extends Model
{
    use Audited;

    protected $table = 'popup_submission';

    protected $guarded = [];

    protected $attributes = ['status' => 'new'];

    protected function casts(): array
    {
        return ['answers' => 'object', 'popup_version' => 'integer'];
    }

    public function popup(): BelongsTo
    {
        return $this->belongsTo(Popup::class);
    }
}
