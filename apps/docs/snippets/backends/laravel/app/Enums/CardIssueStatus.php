<?php

namespace App\Enums;

/** Where a member's card is. Only one that is not revoked per member and design. */
enum CardIssueStatus: string
{
    case Issued = 'issued';
    case Printed = 'printed';
    case Revoked = 'revoked';
}
