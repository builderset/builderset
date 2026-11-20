<?php

namespace App\Models\Concerns;

/**
 * Eloquent writes dates to the second by default. The columns keep
 * microseconds, and saved_at milliseconds, so write them whole, with the
 * offset: what is read back is what was written.
 */
trait PreciseDates
{
    public function getDateFormat(): string
    {
        return 'Y-m-d H:i:s.uP';
    }
}
