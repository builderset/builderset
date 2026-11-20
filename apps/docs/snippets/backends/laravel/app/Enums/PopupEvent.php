<?php

namespace App\Enums;

/** What PopupView's onEvent reports. Each is a counter of popup_daily_stat, by the same name. */
enum PopupEvent: string
{
    case Shown = 'shown';
    case Closed = 'closed';
    case Clicked = 'clicked';
    case Submitted = 'submitted';
}
