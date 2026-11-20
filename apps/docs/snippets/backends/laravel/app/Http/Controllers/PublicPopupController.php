<?php

namespace App\Http\Controllers;

use App\Builderset\Checks;
use App\Enums\Action;
use App\Enums\DocumentKind;
use App\Enums\PopupEvent;
use App\Enums\Status;
use App\Exceptions\ApiError;
use App\Http\Requests\SubmitPopupRequest;
use App\Models\Activity;
use App\Models\Popup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * The popups' public side: no sign-in. Your site asks which popups may show
 * on a page, PopupView reports what happened to one, and a visitor's values
 * are checked against the PUBLISHED popup before anything is stored.
 */
final class PublicPopupController extends Controller
{
    /**
     * GET /api/public/popups?path=&locale= — live today, and meant for this
     * page and language; highest priority first. The trigger, the audience,
     * the frequency and the device are the browser's: `shouldShow` decides.
     */
    public function index(Request $request): array
    {
        ['path' => $path, 'locale' => $locale] = $request->validate([
            'path' => ['required', 'string', 'max:500'],
            'locale' => ['nullable', 'string', 'max:10'],
        ]) + ['locale' => null];

        return Popup::query()
            ->onSite(Date::now())
            ->get()
            ->filter(fn (Popup $popup) => $popup->showsOn($path, $locale))
            ->map(fn (Popup $popup) => [
                'id' => $popup->uuid,
                'version' => $popup->version,
                'document' => $popup->document,
            ])
            ->values()
            ->all();
    }

    /** POST /api/public/popups/:id/events — `{ event }`: one more for today's counter, in one upsert. */
    public function event(Request $request, Popup $popup): Response
    {
        $event = PopupEvent::from($request->validate([
            'event' => ['required', Rule::enum(PopupEvent::class)],
        ])['event']);
        if ($popup->status !== Status::Published) {
            throw ApiError::gone('This popup is not on the site.');
        }
        $column = $event->value;
        DB::table('popup_daily_stat')->upsert(
            ['popup_id' => $popup->id, 'day' => Date::today()->toDateString(), $column => 1],
            uniqueBy: ['popup_id', 'day'],
            update: [$column => DB::raw("popup_daily_stat.{$column} + 1")],
        );

        return response()->noContent();
    }

    /**
     * POST /api/public/popups/:id/submissions — PopupView's onSubmit. Only the
     * values the checker keeps are stored. PopupView reports `submitted`
     * through the events route itself, so it is not counted twice here.
     */
    public function submit(SubmitPopupRequest $request, Checks $checks, Popup $popup): JsonResponse
    {
        if ($popup->status === Status::Draft) {
            throw ApiError::gone('This popup is not on the site.');
        }
        if (! $popup->isOnSite(Date::now())) {
            throw ApiError::gone('This popup is paused or over.');
        }
        $values = $checks->answers(DocumentKind::Popups, $popup->document, $request->raw('values'));

        $submission = DB::transaction(function () use ($request, $popup, $values) {
            $submission = $popup->submissions()->create([
                'popup_version' => $popup->version,
                'answers' => $values,
                'page_path' => $request->validated('path'),
                'locale' => $request->validated('locale'),
                'ip' => config('builderset.popup_store_ip') ? $request->ip() : null,
            ]);
            Activity::log($submission, Action::Created, to: $submission->status, details: ['popup' => $popup->uuid]);

            return $submission;
        });

        return response()->json(['id' => $submission->uuid], 201);
    }
}
