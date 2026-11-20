<?php

use App\Database\AuditColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_template', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->string('name', 120);                // document.meta.name
            $table->string('type_key', 60)->nullable(); // password_reset, newsletter: its variables
            $table->string('status', 16)->default('draft');
            AuditColumns::document($table);
            AuditColumns::add($table);
        });
        AuditColumns::check('email_template', "status in ('draft', 'published')");

        // One active design per email type: the one the mailer sends.
        AuditColumns::index('email_template_one_active_per_type', 'email_template', 'type_key',
            where: "status = 'published' and deleted_at is null", unique: true);
        AuditColumns::index('email_template_list', 'email_template', 'updated_at desc',
            where: 'deleted_at is null');
        AuditColumns::touchTrigger('email_template');

        AuditColumns::revisions('email_template', 'email_template_id');
    }

    public function down(): void
    {
        Schema::dropIfExists('email_template_revision');
        Schema::dropIfExists('email_template');
    }
};
