<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /** `?limit=&offset=`: a page of at most 100 rows. */
    protected function page(Request $request, int $defaultLimit = 50): array
    {
        return [
            'limit' => min(max($request->integer('limit', $defaultLimit), 1), 100),
            'offset' => max($request->integer('offset'), 0),
        ];
    }
}
