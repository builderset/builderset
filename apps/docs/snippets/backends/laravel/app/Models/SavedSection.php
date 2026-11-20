<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Model;

/**
 * A piece of a document saved to reuse. Deleting one hides it from the
 * editor's list; the documents that used it keep their copy.
 */
class SavedSection extends Model
{
    use Audited;

    protected $table = 'saved_section';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            // The editor's { roots, nodes }.
            'fragment' => 'object',
            // An email section kept in step everywhere it is used.
            'synced' => 'boolean',
        ];
    }
}
