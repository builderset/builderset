<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArticleRevision extends Revision
{
    protected $table = 'article_revision';

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
