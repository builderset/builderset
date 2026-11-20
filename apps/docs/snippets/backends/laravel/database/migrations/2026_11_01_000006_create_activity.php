<?php

use App\Database\AuditColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who did what, and when. Appended in the same transaction as the write it
 * records, and never edited. No foreign key to the subject on purpose: the
 * log outlives what it describes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->uuid('uuid')->unique()->default(new Expression('gen_random_uuid()'));
            $table->string('subject_type', 30);
            $table->bigInteger('subject_id');
            $table->string('action', 30);
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30)->nullable();
            $table->jsonb('details')->default('{}');
            AuditColumns::person($table, 'actor_id'); // null: a job, or a visitor
            $table->timestampTz('created_at', 6)->useCurrent();
        });
        AuditColumns::check('activity', "subject_type in ('email_template', 'article', 'form',
            'form_response', 'card_design', 'card_issue', 'popup', 'popup_submission',
            'saved_section', 'media')");
        AuditColumns::check('activity', "action in ('created', 'saved', 'renamed', 'published',
            'scheduled', 'unpublished', 'closed', 'paused', 'issued', 'revoked', 'reverted',
            'status_changed', 'deleted', 'restored')");

        AuditColumns::index('activity_timeline', 'activity', 'subject_type, subject_id, created_at desc');
        AuditColumns::index('activity_by_actor', 'activity', 'actor_id, created_at desc');
    }

    public function down(): void
    {
        Schema::dropIfExists('activity');
    }
};
