<?php

namespace App\Http\Controllers;

use App\Enums\Status;
use App\Models\Article;

/** What your site reads: the live document, never the draft. */
final class PublicArticleController extends Controller
{
    /** GET /api/public/articles/:locale/:slug — the published article. */
    public function show(string $locale, string $slug): array
    {
        $article = Article::query()
            ->where(['locale' => $locale, 'slug' => $slug, 'status' => Status::Published])
            ->with('author:id,uuid,name')
            ->firstOrFail();

        return [
            'id' => $article->uuid,
            'document' => $article->document,
            ...$article->only(['title', 'excerpt', 'cover_key', 'cover_alt', 'published_at']),
            'author' => $article->author?->asPerson(),
        ];
    }
}
