<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('transaction_code', 32)->nullable()->unique();
            $table->string('customer_name')->nullable();
            $table->string('payment_method', 20)->nullable();
            $table->string('promo_code', 80)->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->text('notes')->nullable();
        });

        DB::table('sales')->orderBy('id')->chunkById(500, function ($sales) {
            foreach ($sales as $sale) {
                DB::table('sales')->where('id', $sale->id)->update([
                    'transaction_code' => 'TEKU'.str_pad((string) $sale->id, 9, '0', STR_PAD_LEFT),
                    'subtotal' => $sale->total_amount,
                ]);
            }
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_product_id')
                ->nullable()
                ->constrained('inventory_products')
                ->nullOnDelete();
            $table->string('product_name');
            $table->string('sku', 80)->nullable();
            $table->string('category', 100)->nullable();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->timestamps();

            $table->index(['sale_id', 'inventory_product_id']);
        });

        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('code', 80);
            $table->string('discount_type', 20);
            $table->decimal('discount_value', 12, 2);
            $table->decimal('minimum_purchase', 12, 2)->default(0);
            $table->decimal('maximum_discount', 12, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['code', 'is_active']);
            $table->unique(['user_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('sale_items');
        Schema::table('sales', function (Blueprint $table) {
            $table->dropUnique(['transaction_code']);
            $table->dropColumn([
                'transaction_code',
                'customer_name',
                'payment_method',
                'promo_code',
                'subtotal',
                'discount_amount',
                'notes',
            ]);
        });
    }
};
