<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A version of a form. A response's form_version finds the one the visitor saw. */
class FormRevision extends Revision
{
    protected $table = 'form_revision';

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }
}
