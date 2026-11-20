<?php

namespace App\Enums;

/** What the activity log says happened. */
enum Action: string
{
    case Created = 'created';
    /** A manual save. Autosaves are not logged. */
    case Saved = 'saved';
    /** A name, slug or title changed. */
    case Renamed = 'renamed';
    /** Went live, or went live again. */
    case Published = 'published';
    case Scheduled = 'scheduled';
    /** Back to draft. */
    case Unpublished = 'unpublished';
    /** A form stopped taking responses. */
    case Closed = 'closed';
    /** A popup taken off the site, kept as it is. */
    case Paused = 'paused';
    /** A card made out to a member. */
    case Issued = 'issued';
    /** A member's card cancelled. */
    case Revoked = 'revoked';
    /** A revision restored. */
    case Reverted = 'reverted';
    /** A response's triage. */
    case StatusChanged = 'status_changed';
    case Deleted = 'deleted';
    case Restored = 'restored';
}
