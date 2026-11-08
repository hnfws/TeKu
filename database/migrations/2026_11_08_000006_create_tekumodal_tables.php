<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('account_holder');
            $table->text('account_number');
            $table->string('bank_name', 100);
            $table->string('branch_name')->nullable();
            $table->string('city', 100)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'bank_name']);
        });

        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('principal');
            $table->unsignedTinyInteger('term_months');
            $table->decimal('monthly_interest_rate', 5, 2);
            $table->unsignedBigInteger('total_interest');
            $table->unsignedBigInteger('total_repayment');
            $table->string('status', 30)->default('simulation_active');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        Schema::create('loan_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_application_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('installment_number');
            $table->date('due_date');
            $table->unsignedBigInteger('amount');
            $table->string('status', 20)->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['loan_application_id', 'installment_number']);
            $table->index(['due_date', 'status']);
        });

        Schema::create('loan_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_installment_id')->constrained()->cascadeOnDelete();
            $table->uuid('order_id')->unique();
            $table->string('payment_method', 40);
            $table->unsignedBigInteger('amount');
            $table->text('redirect_url')->nullable();
            $table->string('provider_transaction_id')->nullable()->unique();
            $table->string('status', 30)->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['loan_installment_id', 'status']);
        });

        Schema::create('te_ku_modal_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code', 32)->unique();
            $table->unsignedTinyInteger('discount_percentage')->default(20);
            $table->string('status', 20)->default('available');
            $table->timestamp('claimed_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('te_ku_modal_vouchers');
        Schema::dropIfExists('loan_payments');
        Schema::dropIfExists('loan_installments');
        Schema::dropIfExists('loan_applications');
        Schema::dropIfExists('bank_accounts');
    }
};
