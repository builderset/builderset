<?php

namespace App\Models;

use App\Enums\Action;
use App\Enums\DocumentKind;
use App\Enums\Status;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** One design for an email your app sends. `published` is the one the mailer sends for its type. */
class EmailTemplate extends Document
{
    protected $table = 'email_template';

    public static function kind(): DocumentKind
    {
        return DocumentKind::Emails;
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(EmailTemplateRevision::class);
    }

    public function listColumns(): array
    {
        return ['name', 'type_key'];
    }

    public function copiesOf(object $document): array
    {
        return ['name' => mb_substr($document->meta->name, 0, 120)];
    }

    /** Its email type picks the variables a template may use: a reset email must have the reset link. */
    public function fillNew(array $input): void
    {
        $this->type_key = $input['type_key'] ?? null;
    }

    public function checkerType(): ?string
    {
        return $this->type_key;
    }

    /** One active design per email type: the one before it steps back to draft. */
    public function beforePublish(): void
    {
        if ($this->type_key === null) {
            return;
        }
        $replaced = static::query()
            ->where('type_key', $this->type_key)
            ->where('status', Status::Published)
            ->whereKeyNot($this->getKey())
            ->lockForUpdate()
            ->get();
        foreach ($replaced as $previous) {
            $previous->status = Status::Draft;
            $previous->save();
            Activity::log($previous, Action::Unpublished, Status::Published, Status::Draft, [
                'replaced_by' => $this->uuid,
            ]);
        }
    }
}
