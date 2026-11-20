<?php

namespace App\Builderset;

/** How strictly a document is checked: a draft may be unfinished but never unsafe; publishing refuses every error. */
enum Level: string
{
    case Draft = 'draft';
    case Publish = 'publish';
}
