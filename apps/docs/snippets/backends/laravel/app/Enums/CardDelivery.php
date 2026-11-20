<?php

namespace App\Enums;

/** How a card reaches its member. */
enum CardDelivery: string
{
    case Print = 'print';
    case Wallet = 'wallet';
}
