<?php

namespace App\Http\Controllers;

use App\Enums\Action;
use App\Http\Requests\TriageResponseRequest;
use App\Http\Resources\RowResource;
use App\Models\Activity;
use App\Models\Form;
use App\Models\FormResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

/**
 * Your team's inbox: the Responses tab's counts, the triage, the trash.
 * Only your retention job deletes a response for good.
 */
final class FormResponseController extends Controller
{
    /** GET /api/forms/:id/responses — the editor's loadResponses, and your inbox. */
    public function index(Form $form): array
    {
        $latest = $form->responses()->orderByDesc('created_at')->orderByDesc('id')->limit(20)->get();

        return [
            'total' => $form->responses()->count(),
            'this_week' => $form->responses()->where('created_at', '>', Date::now()->subDays(7))->count(),
            'latest' => $latest->map(fn (FormResponse $response) => [
                'id' => $response->uuid,
                'title' => $response->title(),
                'when' => $response->created_at,
                'status' => $response->status,
            ]),
        ];
    }

    /** PATCH /api/forms/:id/responses/:rid — `{ status, note }`. */
    public function update(TriageResponseRequest $request, Form $form, FormResponse $response): RowResource
    {
        DB::transaction(function () use ($request, $response): void {
            $response = FormResponse::query()->lockForUpdate()->findOrFail($response->getKey());
            $from = $response->status;
            $response->status = $request->validated('status', $response->status);
            if ($request->has('note')) {
                $response->note = $request->validated('note') ?? '';
            }
            if (! $response->isDirty()) {
                return;
            }
            $noted = $response->isDirty('note');
            $response->save();
            // The log's word for any triage; a note alone says so in its details.
            Activity::log($response, Action::StatusChanged, $from, $response->status, $noted ? ['note' => true] : []);
        });

        return new RowResource($response->refresh());
    }

    /** DELETE /api/forms/:id/responses/:rid — into the trash. */
    public function destroy(Form $form, FormResponse $response): Response
    {
        DB::transaction(function () use ($response): void {
            $response->delete();
            Activity::log($response, Action::Deleted, from: $response->status);
        });

        return response()->noContent();
    }
}
