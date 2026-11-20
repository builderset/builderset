<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

/**
 * Publishing is its own permission: a draft and a page in front of readers
 * are different trust. Registered for the Document base class, so it covers
 * all five builders.
 */
final class DocumentPolicy
{
    /** Your rule here — a role, a team, a flag on the user. In this example, everyone on your team may. */
    public function publish(User $user, Document $document): bool
    {
        return true;
    }
}
