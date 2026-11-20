<?php

namespace App\Http\Controllers;

use App\Enums\Action;
use App\Enums\Status;
use App\Exceptions\ApiError;
use App\Models\Activity;
use App\Models\Popup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

/** A popup's own route on your team's side: take it off the site and put it back, as it is. */
final class PopupController extends Controller
{
    /** PATCH /api/popups/:id/pause — `{ paused }`. Neither the document nor its saved_at moves. */
    public function pause(Request $request, Popup $popup): array
    {
        $paused = $request->validate(['paused' => ['required', 'boolean']])['paused'];
        Gate::authorize('publish', $popup);

        return DB::transaction(function () use ($popup, $paused): array {
            $popup = Popup::query()->lockForUpdate()->findOrFail($popup->getKey());
            [$from, $to, $action] = $paused
                ? [Status::Published, Status::Paused, Action::Paused]
                : [Status::Paused, Status::Published, Action::Published];
            if ($popup->status === $to) {
                return ['status' => $popup->status];
            }
            if ($popup->status !== $from) {
                throw ApiError::conflict('Only a published popup is paused, and only a paused one goes back on.');
            }
            $popup->status = $to;
            $popup->save();
            Activity::log($popup, $action, $from, $to);

            return ['status' => $popup->status];
        });
    }
}
