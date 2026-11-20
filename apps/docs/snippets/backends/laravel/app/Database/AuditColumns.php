<?php

namespace App\Database;

use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The columns every table shares, written once for the migrations. The schema
 * builder has no method for a check constraint, a partial index or a trigger,
 * so those three are SQL, here, and nowhere else.
 */
final class AuditColumns
{
    /** The public id, then who made, changed and deleted the row, and when. */
    public static function add(Blueprint $table): void
    {
        $table->uuid('uuid')->unique()->default(new Expression('gen_random_uuid()'));
        $table->timestampTz('created_at', 6)->useCurrent();
        self::person($table, 'created_by_id');
        $table->timestampTz('updated_at', 6)->useCurrent();
        self::person($table, 'updated_by_id');
        $table->timestampTz('deleted_at', 6)->nullable();
        self::person($table, 'deleted_by_id');
    }

    /** A column that names one of your users. Removing the person keeps the row, without their name. */
    public static function person(Blueprint $table, string $column): void
    {
        $table->foreignId($column)->nullable()->constrained('users')->nullOnDelete();
    }

    /** What every document table adds: the live document, the draft since, the two clocks. */
    public static function document(Blueprint $table): void
    {
        $table->jsonb('document');
        $table->jsonb('draft_document')->nullable();
        // Milliseconds: the editor sends it back to catch a stale save.
        $table->timestampTz('saved_at', 3)->useCurrent();
        $table->integer('version')->default(0);
        $table->timestampTz('published_at', 6)->nullable();
        self::person($table, 'published_by_id');
    }

    /** A builder's revisions: one whole document each, written once and never changed. */
    public static function revisions(string $table, string $parent): void
    {
        Schema::create("{$table}_revision", function (Blueprint $revision) use ($table, $parent): void {
            $revision->id()->generatedAs()->always();
            $revision->uuid('uuid')->unique()->default(new Expression('gen_random_uuid()'));
            $revision->foreignId($parent)->constrained($table)->cascadeOnDelete();
            $revision->string('kind', 16);
            $revision->string('label', 120)->nullable();
            $revision->integer('version');
            $revision->jsonb('document');
            $revision->timestampTz('created_at', 6)->useCurrent();
            self::person($revision, 'created_by_id');
        });
        self::check("{$table}_revision", "kind in ('autosave', 'manual', 'publish')");
        self::index("{$table}_revision_history", "{$table}_revision", "{$parent}, created_at desc");
    }

    /** A check constraint. Postgres names it `<table>_<column>_check`, as in the SQL files. */
    public static function check(string $table, string $condition): void
    {
        DB::statement("alter table {$table} add check ({$condition})");
    }

    /** An index; with `$where`, a partial one, so a unique rule holds among live rows only. */
    public static function index(
        string $name,
        string $table,
        string $columns,
        ?string $where = null,
        bool $unique = false,
    ): void {
        DB::statement(sprintf(
            'create %sindex %s on %s (%s)%s',
            $unique ? 'unique ' : '',
            $name,
            $table,
            $columns,
            $where === null ? '' : " where {$where}",
        ));
    }

    /** updated_at follows every change, whoever makes it: the app, a job, psql. */
    public static function touchTrigger(string $table): void
    {
        DB::statement(
            "create trigger {$table}_touch before update on {$table} "
            .'for each row execute function touch_updated_at()'
        );
    }
}
