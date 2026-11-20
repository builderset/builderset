<?php

use App\Enums\DocumentKind;
use App\Http\Controllers\CardIssueController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\FormResponseController;
use App\Http\Controllers\HistoryController;
use App\Http\Controllers\LibraryController;
use App\Http\Controllers\PopupController;
use App\Http\Controllers\PublicArticleController;
use App\Http\Controllers\PublicFormController;
use App\Http\Controllers\PublicPopupController;
use Illuminate\Support\Facades\Route;

// ── Visitors: no sign-in ─────────────────────────────────────────────────────

Route::prefix('public')->group(function (): void {
    Route::get('articles/{locale}/{slug}', [PublicArticleController::class, 'show']);

    Route::get('forms/{slug}', [PublicFormController::class, 'show']);
    Route::post('forms/{slug}/responses', [PublicFormController::class, 'respond'])
        ->middleware('throttle:visitors');

    Route::get('popups', [PublicPopupController::class, 'index']);
    Route::prefix('popups/{popup}')->whereUuid('popup')->group(function (): void {
        Route::post('events', [PublicPopupController::class, 'event'])->middleware('throttle:events');
        Route::post('submissions', [PublicPopupController::class, 'submit'])->middleware('throttle:visitors');
    });
});

// ── Your team's: signed in ───────────────────────────────────────────────────
// Swap the stand-in for your own guard: 'auth:sanctum'.

Route::middleware('sign-in-stand-in')->group(function (): void {
    Route::post('uploads', [LibraryController::class, 'upload']);

    // Each builder's own. A response or an issue is found inside its form or design.
    Route::scopeBindings()->group(function (): void {
        Route::prefix('forms/{form}/responses')->whereUuid(['form', 'response'])->group(function (): void {
            Route::get('/', [FormResponseController::class, 'index']);
            Route::patch('{response}', [FormResponseController::class, 'update']);
            Route::delete('{response}', [FormResponseController::class, 'destroy']);
        });
        Route::prefix('cards/{card}/issues')->whereUuid(['card', 'issue'])->group(function (): void {
            Route::get('/', [CardIssueController::class, 'index']);
            Route::post('/', [CardIssueController::class, 'store']);
            Route::post('{issue}/revoke', [CardIssueController::class, 'revoke']);
        });
    });
    Route::post('emails/{email}/send', [EmailController::class, 'send'])->whereUuid('email');
    Route::patch('popups/{popup}/pause', [PopupController::class, 'pause'])->whereUuid('popup');

    // The same routes for every builder: /api/emails, /api/articles, /api/forms,
    // /api/cards and /api/popups.
    Route::prefix('{kind}')->whereIn('kind', DocumentKind::values())->group(function (): void {
        Route::get('sections', [LibraryController::class, 'sections']);
        Route::post('sections', [LibraryController::class, 'saveSection']);
        Route::delete('sections/{section}', [LibraryController::class, 'deleteSection'])->whereUuid('section');

        Route::get('/', [DocumentController::class, 'index']);
        Route::post('/', [DocumentController::class, 'store']);

        Route::prefix('{id}')->whereUuid('id')->group(function (): void {
            Route::get('/', [DocumentController::class, 'show']);
            Route::put('draft', [DocumentController::class, 'saveDraft']);
            Route::post('publish', [DocumentController::class, 'publish']);
            Route::post('unpublish', [DocumentController::class, 'unpublish']);
            Route::delete('/', [DocumentController::class, 'destroy']);
            Route::post('restore', [DocumentController::class, 'restore']);

            Route::get('revisions', [HistoryController::class, 'index']);
            Route::post('revisions', [HistoryController::class, 'store']);
            Route::get('revisions/{revision}', [HistoryController::class, 'show'])->whereUuid('revision');
            Route::get('activity', [HistoryController::class, 'activity']);
        });
    });
});
