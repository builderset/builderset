<?php

use App\Database\AuditColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_design', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->string('name', 120);                 // document.meta.name
            $table->string('format', 20)->default('membership');
            // Copies of the document's size, for lists and the print order.
            $table->decimal('width_mm', 6, 2);
            $table->decimal('height_mm', 6, 2);
            $table->smallInteger('sides')->default(2);
            $table->string('status', 16)->default('draft');
            AuditColumns::document($table);
            AuditColumns::add($table);
        });
        AuditColumns::check('card_design', "format in ('membership', 'id', 'bank', 'business',
            'badge', 'wallet', 'custom')");
        AuditColumns::check('card_design', 'sides in (1, 2)');
        AuditColumns::check('card_design', "status in ('draft', 'published')");
        AuditColumns::index('card_design_list', 'card_design', 'updated_at desc',
            where: 'deleted_at is null');
        AuditColumns::touchTrigger('card_design');

        AuditColumns::revisions('card_design', 'card_design_id');

        // One card made out to one member. The design's version and the data are
        // frozen when it is issued, so a reprint matches the card in their hand.
        Schema::create('card_issue', function (Blueprint $table): void {
            $table->id()->generatedAs()->always();
            $table->foreignId('card_design_id')->constrained('card_design');
            $table->integer('design_version');
            $table->string('member_ref', 120);           // your member's id, as your system knows it
            $table->string('number', 40);                // printed on the card
            $table->jsonb('data');                       // { "member.name": "Arben Hoxha" }
            $table->string('status', 16)->default('issued');
            $table->string('delivery', 16)->default('print');
            $table->date('valid_until')->nullable();
            $table->timestampTz('printed_at', 6)->nullable();
            $table->timestampTz('revoked_at', 6)->nullable();
            AuditColumns::person($table, 'revoked_by_id');
            $table->string('revoke_reason', 200)->nullable();
            AuditColumns::add($table);
        });
        AuditColumns::check('card_issue', "status in ('issued', 'printed', 'revoked')");
        AuditColumns::check('card_issue', "delivery in ('print', 'wallet')");

        // A number is never reused, not even after a revoke.
        AuditColumns::index('card_issue_number', 'card_issue', 'number', unique: true);
        // A member holds one valid card of a design at a time.
        AuditColumns::index('card_issue_one_valid', 'card_issue', 'card_design_id, member_ref',
            where: "status <> 'revoked' and deleted_at is null", unique: true);
        AuditColumns::index('card_issue_by_member', 'card_issue', 'member_ref, created_at desc');
        AuditColumns::touchTrigger('card_issue');
    }

    public function down(): void
    {
        Schema::dropIfExists('card_issue');
        Schema::dropIfExists('card_design_revision');
        Schema::dropIfExists('card_design');
    }
};
