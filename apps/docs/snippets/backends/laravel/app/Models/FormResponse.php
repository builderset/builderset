<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One submission. `created_by` is the visitor when signed in; `updated_by`
 * is whoever on your team last triaged it. Your retention job deletes old
 * ones for good: the one place a row is removed, because privacy law asks.
 */
class FormResponse extends Model
{
    use Audited;

    /** Your team's own triage. Change the words to your team's. */
    public const STATUSES = ['new', 'called', 'done'];

    protected $table = 'form_response';

    protected $guarded = [];

    protected $attributes = ['status' => 'new', 'note' => ''];

    protected function casts(): array
    {
        return [
            // What the checker kept: shown fields only, numbers as numbers.
            'answers' => 'object',
            'form_version' => 'integer',
        ];
    }

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }

    /** A line for the Responses tab: the first text answer. */
    public function title(): string
    {
        foreach ((array) $this->answers as $answer) {
            if (is_string($answer) && trim($answer) !== '') {
                return mb_substr($answer, 0, 80);
            }
        }

        return 'Response '.substr($this->uuid, 0, 8);
    }
}
