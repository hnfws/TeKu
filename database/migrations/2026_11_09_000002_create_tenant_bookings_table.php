<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('event_tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('voucher_id')->nullable()->constrained('te_ku_modal_vouchers')->nullOnDelete();
            $table->uuid('order_id')->unique();
            $table->string('payment_method', 40);
            $table->unsignedBigInteger('base_amount');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('amount');
            $table->text('redirect_url')->nullable();
            $table->string('provider_transaction_id')->nullable()->unique();
            $table->string('status', 30)->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_bookings');
    }
};
