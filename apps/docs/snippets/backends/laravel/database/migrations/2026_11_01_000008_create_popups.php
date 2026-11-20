<?php

use App\Database\AuditColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('popup', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->string('name', 120);                 // document.meta.name
            $table->string('type', 16)->default('modal');
            $table->string('status', 16)->default('draft');
            // Copies of document.display, so the site asks one indexed question.
            $table->timestampTz('starts_at', 6)->nullable();
            $table->timestampTz('ends_at', 6)->nullable();
            $table->smallInteger('priority')->default(0);
            AuditColumns::document($table);
            AuditColumns::add($table);
        });
        AuditColumns::check('popup', "type in ('modal', 'slidein', 'bartop', 'barbottom',
            'fullscreen', 'drawer', 'inline')");
        AuditColumns::check('popup', "status in ('draft', 'published', 'paused')");
        AuditColumns::check('popup', 'ends_at is null or starts_at is null or ends_at > starts_at');
        AuditColumns::index('popup_live', 'popup', 'priority desc',
            where: "status = 'published' and deleted_at is null");
        AuditColumns::touchTrigger('popup');

        AuditColumns::revisions('popup', 'popup_id');

        // What a visitor typed into a popup's inputs: the checker's values only.
        Schema::create('popup_submission', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->foreignId('popup_id')->constrained('popup')->cascadeOnDelete();
            $table->integer('popup_version');
            $table->jsonb('answers');
            $table->string('page_path', 500)->nullable();
            $table->string('locale', 10)->nullable();
            $table->string('status', 30)->default('new');
            $table->ipAddress('ip')->nullable();
            AuditColumns::add($table);
        });
        AuditColumns::index('popup_submission_inbox', 'popup_submission', 'popup_id, created_at desc',
            where: 'deleted_at is null');
        AuditColumns::touchTrigger('popup_submission');

        // How a popup did, one row per popup and day: counters, never a row per view.
        Schema::create('popup_daily_stat', function (Blueprint $table): void {
            $table->foreignId('popup_id')->constrained('popup')->cascadeOnDelete();
            $table->date('day');
            $table->integer('shown')->default(0);
            $table->integer('closed')->default(0);
            $table->integer('clicked')->default(0);
            $table->integer('submitted')->default(0);
            $table->primary(['popup_id', 'day']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('popup_daily_stat');
        Schema::dropIfExists('popup_submission');
        Schema::dropIfExists('popup_revision');
        Schema::dropIfExists('popup');
    }
};
