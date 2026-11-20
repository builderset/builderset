<?php

use App\Database\AuditColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A piece of a document saved to reuse: an email header, an article's call to action.
        Schema::create('saved_section', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->string('kit', 16);
            $table->string('name', 120);
            $table->jsonb('fragment');                   // the editor's { roots, nodes }
            $table->boolean('synced')->default(false);   // an email section kept in step everywhere
            AuditColumns::add($table);
        });
        AuditColumns::check('saved_section', "kit in ('email', 'article', 'form')");
        AuditColumns::index('saved_section_by_kit', 'saved_section', 'kit, name',
            where: 'deleted_at is null');
        AuditColumns::touchTrigger('saved_section');

        // Every uploaded file, by the key the documents store: never a URL.
        Schema::create('media', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->string('key', 300)->unique();        // 2026/11/3f9c….png
            $table->string('kind', 8);
            $table->string('mime', 100);                 // known by the file's first bytes
            $table->integer('size');
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->string('name', 300);                 // the name it was uploaded with
            $table->string('alt', 300)->default('');
            $table->char('sha256', 64);                  // the same file twice is one row
            AuditColumns::add($table);
        });
        AuditColumns::check('media', "kind in ('image', 'video', 'audio', 'file')");
        AuditColumns::check('media', 'size > 0');
        AuditColumns::index('media_library', 'media', 'kind, created_at desc',
            where: 'deleted_at is null');
        AuditColumns::index('media_by_hash', 'media', 'sha256');
        AuditColumns::touchTrigger('media');
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
        Schema::dropIfExists('saved_section');
    }
};
