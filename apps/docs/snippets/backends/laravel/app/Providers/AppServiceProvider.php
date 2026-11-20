<?php

namespace App\Providers;

use App\Builderset\Checker;
use App\Builderset\Schemas;
use App\Models\Article;
use App\Models\CardDesign;
use App\Models\CardIssue;
use App\Models\Document;
use App\Models\EmailTemplate;
use App\Models\Form;
use App\Models\FormResponse;
use App\Models\Media;
use App\Models\Popup;
use App\Models\PopupSubmission;
use App\Models\SavedSection;
use App\Policies\DocumentPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Schemas::class, fn () => new Schemas(resource_path('schemas')));
        $this->app->singleton(Checker::class, fn ($app) => new Checker(
            $app->make(Http::class),
            config('builderset.checker.url'),
            config('builderset.checker.timeout'),
        ));
    }

    public function boot(): void
    {
        // The activity log names a row by its table, the same words as the SQL.
        Relation::enforceMorphMap([
            'email_template' => EmailTemplate::class,
            'article' => Article::class,
            'form' => Form::class,
            'form_response' => FormResponse::class,
            'card_design' => CardDesign::class,
            'card_issue' => CardIssue::class,
            'popup' => Popup::class,
            'popup_submission' => PopupSubmission::class,
            'saved_section' => SavedSection::class,
            'media' => Media::class,
        ]);

        Gate::policy(Document::class, DocumentPolicy::class);

        // The answers are the objects themselves, not wrapped in `data`.
        JsonResource::withoutWrapping();

        // What a visitor may send: a response or a submission, and a popup's events.
        RateLimiter::for('visitors', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('events', fn (Request $request) => Limit::perMinute(120)->by($request->ip()));
    }
}
