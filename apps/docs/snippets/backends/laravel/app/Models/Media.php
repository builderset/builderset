<?php

namespace App\Models;

use App\Models\Concerns\Audited;
use Illuminate\Database\Eloquent\Model;

/**
 * Every uploaded file, by the key the documents store — never a URL, so a
 * CDN can move in front. `created_by` is who uploaded it. A deleted file
 * stays in storage until a job of yours removes the ones nothing uses.
 */
class Media extends Model
{
    use Audited;

    /** The largest file the library takes, in bytes. */
    public const MAX_BYTES = 10 * 1024 * 1024;

    /** The files the library takes, by the type their first bytes show: [kind, extension]. */
    public const TYPES = [
        'image/png' => ['image', 'png'],
        'image/jpeg' => ['image', 'jpg'],
        'image/gif' => ['image', 'gif'],
        'image/webp' => ['image', 'webp'],
        'video/mp4' => ['video', 'mp4'],
        'video/webm' => ['video', 'webm'],
        'audio/mpeg' => ['audio', 'mp3'],
        'application/pdf' => ['file', 'pdf'],
    ];

    protected $table = 'media';

    protected $guarded = [];

    protected $attributes = ['alt' => ''];

    protected function casts(): array
    {
        return ['size' => 'integer', 'width' => 'integer', 'height' => 'integer'];
    }
}
