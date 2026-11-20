<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Query\Expression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * What every table below relies on: a public id on your users, which answers
 * show instead of their internal one, and the function the touch triggers call.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->uuid('uuid')->unique()->default(new Expression('gen_random_uuid()'));
        });

        DB::unprepared(<<<'SQL'
            create or replace function touch_updated_at() returns trigger
            language plpgsql as $$
            begin
              new.updated_at := now();
              return new;
            end;
            $$;
            SQL);
    }

    public function down(): void
    {
        DB::unprepared('drop function touch_updated_at()');
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('uuid');
        });
    }
};
