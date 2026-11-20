<?php

namespace App\Http\Controllers;

use App\Builderset\Checks;
use App\Enums\Action;
use App\Enums\DocumentKind;
use App\Exceptions\ApiError;
use App\Http\Requests\SaveSectionRequest;
use App\Http\Requests\UploadRequest;
use App\Http\Resources\MediaResource;
use App\Http\Resources\SectionResource;
use App\Models\Activity;
use App\Models\Media;
use App\Models\SavedSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Saved sections, per builder, and uploads. A file is known by its first
 * bytes, never by its name, and the same bytes uploaded twice are one row.
 */
final class LibraryController extends Controller
{
    /** GET /api/{kind}/sections — the editor's loadSections. */
    public function sections(DocumentKind $kind): AnonymousResourceCollection
    {
        $this->assertHasSections($kind);

        return SectionResource::collection(
            SavedSection::query()->where('kit', $kind->kit())->orderBy('name')->get(),
        );
    }

    /** POST /api/{kind}/sections — the editor's saveSection: `{ name, fragment }`. */
    public function saveSection(SaveSectionRequest $request, Checks $checks, DocumentKind $kind): JsonResponse
    {
        $this->assertHasSections($kind);
        $fragment = $checks->fragment($kind, $request->raw('fragment'));

        $section = DB::transaction(function () use ($request, $kind, $fragment): SavedSection {
            $section = SavedSection::query()->create([
                'kit' => $kind->kit(),
                'name' => trim($request->validated('name')),
                'fragment' => $fragment,
            ]);
            Activity::log($section, Action::Created);

            return $section;
        });

        return (new SectionResource($section))->response()->setStatusCode(201);
    }

    /** DELETE /api/{kind}/sections/:sid — your library screen. Documents that used it keep their copy. */
    public function deleteSection(DocumentKind $kind, string $section): Response
    {
        $this->assertHasSections($kind);
        DB::transaction(function () use ($kind, $section): void {
            $row = SavedSection::query()->where(['kit' => $kind->kit(), 'uuid' => $section])
                ->lockForUpdate()->firstOrFail();
            $row->delete();
            Activity::log($row, Action::Deleted);
        });

        return response()->noContent();
    }

    /**
     * POST /api/uploads — the editor's upload. PHP's own limits come first:
     * raise `upload_max_filesize` and `post_max_size` to Media::MAX_BYTES.
     */
    public function upload(UploadRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $asked = $request->validated('kind');
        if ($file->getSize() > Media::MAX_BYTES) {
            throw ApiError::tooLarge('This file is larger than the library takes.');
        }
        // The type its bytes show, read by PHP's fileinfo: never the name or the browser's word.
        [$kind, $extension] = Media::TYPES[$file->getMimeType()] ?? [null, null];
        // `file` takes any type the library knows; the others must be what they say.
        if ($kind === null || ($asked !== 'file' && $kind !== $asked)) {
            throw ApiError::unsupported("This is not a file of the kind \"{$asked}\" the library takes.");
        }

        $media = DB::transaction(function () use ($file, $kind, $extension): Media {
            $sha256 = hash_file('sha256', $file->getRealPath());
            // The same bytes twice are one file: hand back the one already stored.
            $known = Media::query()->where('sha256', $sha256)->first();
            if ($known !== null) {
                return $known;
            }
            $media = Media::query()->create([
                'key' => $this->store($file, $extension),
                'kind' => $kind,
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
                ...$this->dimensions($file, $kind),
                'name' => mb_substr($file->getClientOriginalName(), 0, 300),
                'sha256' => $sha256,
            ]);
            Activity::log($media, Action::Created);

            return $media;
        });

        return (new MediaResource($media))->response()->setStatusCode(201);
    }

    /** Under a key of ours, by month: a client's file name never becomes a path. */
    private function store(UploadedFile $file, string $extension): string
    {
        return $file->storeAs(Date::now()->format('Y/m'), Str::uuid().".{$extension}", 'public');
    }

    /** An image's size, so the editor can hold its space before it loads. */
    private function dimensions(UploadedFile $file, string $kind): array
    {
        $size = $kind === 'image' ? getimagesize($file->getRealPath()) : false;

        return ['width' => $size[0] ?? null, 'height' => $size[1] ?? null];
    }

    /** Cards and popups place their elements freely: they have no library of sections. */
    private function assertHasSections(DocumentKind $kind): void
    {
        abort_unless($kind->hasSections(), 404);
    }
}
