<?php

namespace App\Http\Controllers;

use App\Builderset\Checks;
use App\Enums\Action;
use App\Enums\DocumentKind;
use App\Enums\Status;
use App\Exceptions\ApiError;
use App\Http\Requests\SubmitFormRequest;
use App\Models\Activity;
use App\Models\Form;
use App\Models\FormResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * The form's public side: no sign-in. A response is checked against the
 * PUBLISHED document, never the draft, and only what the checker keeps is
 * stored.
 */
final class PublicFormController extends Controller
{
    /** GET /api/public/forms/:slug — the form, for the page that shows it. */
    public function show(string $slug): JsonResponse
    {
        $form = Form::findPublic($slug);
        $closed = $form->isClosedNow();

        // Closed, the page still gets the document: <FormView closed> shows the
        // closed message in the form's own look.
        return response()->json(['document' => $form->document, 'closed' => $closed], $closed ? 410 : 200);
    }

    /** POST /api/public/forms/:slug/responses — FormView's onSubmit. */
    public function respond(SubmitFormRequest $request, Checks $checks, string $slug): JsonResponse
    {
        $form = Form::findPublic($slug);
        if ($form->isClosedNow()) {
            throw $this->closed($form);
        }
        // The hidden trap is filled only by bots. They are told it worked and
        // nothing is stored, so they learn nothing to work around.
        if ($request->isTrapped()) {
            return response()->json(['id' => null], 201);
        }

        $values = $checks->answers(DocumentKind::Forms, $form->document, $request->raw('answers'));
        $response = $this->store($form, $values, $request->validated('locale'), $request->ip());
        if ($response === null) {
            throw $this->closed($form);
        }

        return response()->json(['id' => $response->uuid], 201);
    }

    /**
     * The response, and the count that limits them, in one transaction. The
     * count goes up in the statement that checks maxResponses, so two
     * visitors cannot both take the last place. Null when the form filled up.
     */
    private function store(Form $form, object $values, ?string $locale, ?string $ip): ?FormResponse
    {
        $max = $form->document->settings->limits->maxResponses;

        return DB::transaction(function () use ($form, $values, $locale, $ip, $max): ?FormResponse {
            $counted = Form::query()
                ->whereKey($form->getKey())
                ->where('status', Status::Published)
                ->when($max !== null, fn ($query) => $query->where('response_count', '<', $max))
                ->increment('response_count');
            if ($counted === 0) {
                return null;
            }
            // A signed-in visitor is the response's creator (the Audited trait); anyone else leaves it null.
            $response = $form->responses()->create([
                'form_version' => $form->version,
                'answers' => $values,
                'locale' => $locale,
                'ip' => $form->document->settings->privacy->storeIp ? $ip : null,
            ]);
            Activity::log($response, Action::Created, to: $response->status, details: ['form' => $form->uuid]);

            return $response;
        });
    }

    /** 410, with the form's own closed message for the visitor. */
    private function closed(Form $form): ApiError
    {
        return ApiError::gone($form->document->settings->limits->closedMessage, ['closed' => true]);
    }
}
