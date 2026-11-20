<?php

namespace App\Http\Controllers;

use App\Builderset\Issue;
use App\Enums\Action;
use App\Enums\CardIssueStatus;
use App\Enums\Status;
use App\Exceptions\ApiError;
use App\Http\Requests\IssueCardRequest;
use App\Http\Resources\RowResource;
use App\Models\Activity;
use App\Models\CardDesign;
use App\Models\CardIssue;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;

/**
 * The cards made from a design, one per member. A card is made from the
 * PUBLISHED design, and keeps its version: a reprint matches the card in
 * the member's hand, whatever the design became since.
 */
final class CardIssueController extends Controller
{
    /** How many times a new number is drawn before giving up: a repeat is one in a trillion. */
    private const NUMBER_ATTEMPTS = 3;

    /** GET /api/cards/:id/issues — `?status=&limit=&offset=`, newest first. */
    public function index(Request $request, CardDesign $card): array
    {
        $query = $card->issues()
            ->when(CardIssueStatus::tryFrom($request->string('status')->value()), fn ($query, $status) => $query->where('status', $status));
        ['limit' => $limit, 'offset' => $offset] = $this->page($request);

        return [
            'items' => RowResource::collection($query->clone()
                ->orderByDesc('created_at')->orderByDesc('id')
                ->offset($offset)->limit($limit)->get()),
            'total' => $query->count(),
        ];
    }

    /** POST /api/cards/:id/issues — a card made out to a member. */
    public function store(IssueCardRequest $request, CardDesign $card): JsonResponse
    {
        if ($card->status !== Status::Published) {
            throw ApiError::refused([Issue::error('card.notPublished')]);
        }
        for ($attempt = 1; ; $attempt++) {
            try {
                return (new RowResource($this->issue($card, $request->validated(), $request->raw('data'))))
                    ->response()->setStatusCode(201);
            } catch (UniqueConstraintViolationException $taken) {
                // Two indexes can refuse it, and only one is the member's.
                if (str_contains($taken->getMessage(), 'card_issue_one_valid')) {
                    throw ApiError::conflict('This member already holds a valid card of this design: revoke it first.');
                }
                if ($attempt === self::NUMBER_ATTEMPTS) {
                    throw $taken;
                }
            }
        }
    }

    private function issue(CardDesign $card, array $input, object $data): CardIssue
    {
        return DB::transaction(function () use ($card, $input, $data): CardIssue {
            $issue = $card->issues()->create([
                'design_version' => $card->version,
                'member_ref' => $input['member_ref'],
                'number' => CardIssue::newNumber(),
                'data' => $data,
                'delivery' => $input['delivery'] ?? 'print',
                'valid_until' => $input['valid_until'] ?? null,
            ]);
            Activity::log($issue, Action::Issued, to: $issue->status, details: [
                'design' => $card->uuid,
                'number' => $issue->number,
            ]);

            return $issue;
        });
    }

    /** POST /api/cards/:id/issues/:iid/revoke — `{ reason }`: the card no longer counts. */
    public function revoke(Request $request, CardDesign $card, CardIssue $issue): RowResource
    {
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:200']])['reason'] ?? null;

        $revoked = DB::transaction(function () use ($issue, $reason): CardIssue {
            $issue = CardIssue::query()->lockForUpdate()->findOrFail($issue->getKey());
            if ($issue->status === CardIssueStatus::Revoked) {
                throw ApiError::conflict('This card is revoked already.');
            }
            $from = $issue->status;
            $issue->forceFill([
                'status' => CardIssueStatus::Revoked,
                'revoked_at' => Date::now(),
                'revoked_by_id' => Auth::id(),
                'revoke_reason' => $reason,
            ])->save();
            Activity::log($issue, Action::Revoked, $from, $issue->status, $reason ? ['reason' => $reason] : []);

            return $issue;
        });

        return new RowResource($revoked);
    }
}
