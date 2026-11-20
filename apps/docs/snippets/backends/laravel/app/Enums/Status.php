<?php

namespace App\Enums;

/** Where a document is. Each table's check constraint names the ones it takes. */
enum Status: string
{
    case Draft = 'draft';
    /** An article set to go live at `scheduled_at`: a job of yours publishes it then. */
    case Scheduled = 'scheduled';
    case Published = 'published';
    case Archived = 'archived';
    /** A form that keeps its link and shows its closed message. */
    case Closed = 'closed';
    /** A popup taken off the site and kept as it is. */
    case Paused = 'paused';

    /** What unpublishing takes back: live now, set to go live, or paused. */
    public function isUnpublishable(): bool
    {
        return in_array($this, [self::Published, self::Scheduled, self::Paused], true);
    }
}
