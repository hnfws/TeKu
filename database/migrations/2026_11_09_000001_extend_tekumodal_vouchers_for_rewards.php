<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('te_ku_modal_vouchers', function (Blueprint $table) {
            $table->string('type', 40)->default('tenant_discount_20')->after('code');
            $table->unsignedSmallInteger('points_cost')->default(0)->after('discount_percentage');
            $table->unsignedBigInteger('max_discount_amount')->nullable()->after('points_cost');
            $table->decimal('interest_rate', 5, 2)->nullable()->after('max_discount_amount');
            $table->foreignId('loan_application_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('te_ku_modal_vouchers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('loan_application_id');
            $table->dropColumn(['type', 'points_cost', 'max_discount_amount', 'interest_rate']);
        });
    }
};
