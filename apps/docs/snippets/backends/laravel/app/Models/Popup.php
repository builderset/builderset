<?php

namespace App\Models;

use App\Enums\DocumentKind;
use App\Enums\Status;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Date;

/**
 * A popup. `paused` takes it off the site and keeps it as it is. The site
 * asks one indexed question — which popups are live today — and the rest of
 * the display rules run in the browser with the kit's `shouldShow`.
 */
class Popup extends Document
{
    protected $table = 'popup';

    protected function casts(): array
    {
        return [
            ...parent::casts(),
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'priority' => 'integer',
        ];
    }

    public static function kind(): DocumentKind
    {
        return DocumentKind::Popups;
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(PopupRevision::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(PopupSubmission::class);
    }

    public function listColumns(): array
    {
        return ['name', 'type', 'priority', 'starts_at', 'ends_at'];
    }

    /**
     * The root holds the popup's type and its display rules. `starts` and
     * `ends` are whole days, both included, in each VISITOR's time zone. The
     * copies widen the window to cover every zone on Earth — from 14 hours
     * before the first day to 12 hours after the last — and `shouldShow`
     * holds each visitor to their own date in the browser.
     */
    public function copiesOf(object $document): array
    {
        $root = $document->nodes->{$document->root}->props;
        $display = $root->display;
        $startsAt = $display->starts !== ''
            ? Date::parse($display->starts, 'UTC')->startOfDay()->subHours(14)
            : null;
        $endsAt = $display->ends !== ''
            ? Date::parse($display->ends, 'UTC')->startOfDay()->addDay()->addHours(12)
            : null;
        // A draft may have its dates the wrong way round; publishing refuses that.
        if ($startsAt !== null && $endsAt !== null && $endsAt->lessThanOrEqualTo($startsAt)) {
            $endsAt = null;
        }

        return [
            'name' => mb_substr($document->meta->name, 0, 120),
            'type' => $root->type,
            'priority' => $display->priority,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ];
    }

    /** Live on the site now: published, and inside its dates. Highest priority first. */
    public function scopeOnSite(Builder $query, CarbonInterface $now): void
    {
        $query->where('status', Status::Published)
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', $now))
            ->orderByDesc('priority')
            ->orderBy('id');
    }

    /** Whether it is published and inside its dates: what takes a visitor's submission. */
    public function isOnSite(CarbonInterface $now): bool
    {
        return $this->status === Status::Published
            && ($this->starts_at === null || $this->starts_at->lessThanOrEqualTo($now))
            && ($this->ends_at === null || $this->ends_at->greaterThan($now));
    }

    /**
     * The two display rules a server can answer for a page: its address and
     * its language. The same rules as the kit's `pathMatches` and
     * `languageMatches`, so the browser never gets a popup that cannot show.
     */
    public function showsOn(string $path, ?string $language): bool
    {
        $display = $this->document->nodes->{$this->document->root}->props->display;
        if ($display->pages !== 'all') {
            $listed = false;
            foreach ($display->rules as $rule) {
                $listed = $listed || (trim($rule) !== '' && self::pathMatches($rule, $path));
            }
            if ($display->pages === 'only' ? ! $listed : $listed) {
                return false;
            }
        }
        if ($display->language === 'all') {
            return true;
        }
        $wanted = strtolower($display->language);
        $page = strtolower($language ?? '');

        return $page === $wanted || str_starts_with($page, "{$wanted}-");
    }

    /** `*` stands for any part of a path, slashes included: `/blog/*`. */
    private static function pathMatches(string $rule, string $path): bool
    {
        $parts = array_map(fn (string $part) => preg_quote($part, '#'), explode('*', self::normalise(trim($rule))));

        return preg_match('#^'.implode('.*', $parts).'$#s', self::normalise($path)) === 1;
    }

    /** No query or hash, a leading slash, no trailing one but the root's. */
    private static function normalise(string $path): string
    {
        $clean = '/'.ltrim(preg_split('/[?#]/', $path, 2)[0], '/');

        return $clean === '/' ? $clean : rtrim($clean, '/');
    }
}
