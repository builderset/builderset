<?php

use App\Database\AuditColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->string('slug', 80);              // example.com/f/<slug>: document.meta.slug
            $table->string('name', 120)->default(''); // document.meta.name
            $table->string('status', 16)->default('draft');
            $table->integer('response_count')->default(0);
            AuditColumns::document($table);
            $table->timestampTz('closed_at', 6)->nullable();
            AuditColumns::person($table, 'closed_by_id');
            AuditColumns::add($table);
        });
        AuditColumns::check('form', "status in ('draft', 'published', 'closed')");

        // A new form stores `draft-<uuid>` until publishing copies its real address.
        AuditColumns::index('form_slug', 'form', 'slug', where: 'deleted_at is null', unique: true);
        AuditColumns::touchTrigger('form');

        AuditColumns::revisions('form', 'form_id');

        // One row per submission: what the checker kept, never the raw body.
        Schema::create('form_response', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->foreignId('form_id')->constrained('form')->cascadeOnDelete();
            $table->integer('form_version');
            $table->jsonb('answers');
            $table->string('locale', 10)->nullable();
            $table->string('status', 30)->default('new'); // your team's triage
            $table->text('note')->default('');
            $table->ipAddress('ip')->nullable();          // only when settings.privacy.storeIp is on
            AuditColumns::add($table);
        });
        AuditColumns::index('form_response_inbox', 'form_response', 'form_id, created_at desc',
            where: 'deleted_at is null');
        // The retention job's question: what is older than settings.privacy.keepMonths.
        AuditColumns::index('form_response_age', 'form_response', 'created_at');
        AuditColumns::touchTrigger('form_response');
    }

    public function down(): void
    {
        Schema::dropIfExists('form_response');
        Schema::dropIfExists('form_revision');
        Schema::dropIfExists('form');
    }
};
