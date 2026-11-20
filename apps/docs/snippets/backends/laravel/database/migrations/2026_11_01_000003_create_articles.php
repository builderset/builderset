<?php

use App\Database\AuditColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->string('slug', 200);
            $table->string('locale', 10);
            $table->string('status', 16)->default('draft');
            $table->timestampTz('scheduled_at', 6)->nullable(); // a job publishes it then

            // Copies of document.meta, for lists, search and cards.
            $table->string('title', 300)->default('');
            $table->string('excerpt', 600)->default('');
            $table->string('cover_key', 300)->nullable();
            $table->string('cover_alt', 300)->nullable();
            AuditColumns::person($table, 'author_id'); // the byline

            AuditColumns::document($table);
            AuditColumns::add($table);
        });
        AuditColumns::check('article', "status in ('draft', 'scheduled', 'published', 'archived')");

        // Partial, so a deleted article frees its address.
        AuditColumns::index('article_slug_locale', 'article', 'slug, locale',
            where: 'deleted_at is null', unique: true);
        AuditColumns::index('article_published', 'article', 'locale, published_at desc',
            where: "status = 'published' and deleted_at is null");
        AuditColumns::index('article_due', 'article', 'scheduled_at',
            where: "status = 'scheduled' and deleted_at is null");
        AuditColumns::touchTrigger('article');

        AuditColumns::revisions('article', 'article_id');
    }

    public function down(): void
    {
        Schema::dropIfExists('article_revision');
        Schema::dropIfExists('article');
    }
};
