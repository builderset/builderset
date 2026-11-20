<?php

namespace App\Enums;

/** Why a revision was written. */
enum RevisionKind: string
{
    case Autosave = 'autosave';
    case Manual = 'manual';
    case Publish = 'publish';
}
