<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('sku', 80);
            $table->string('category', 100)->default('Lainnya');
            $table->text('description')->nullable();
            $table->string('unit', 40)->default('unit');
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('min_stock')->default(0);
            $table->decimal('cost_price', 12, 2)->default(0);
            $table->decimal('selling_price', 12, 2)->default(0);
            $table->date('production_date')->nullable();
            $table->date('expiration_date')->nullable();
            $table->string('image_path')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'sku']);
            $table->index(['user_id', 'category']);
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_product_id')->constrained('inventory_products')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->unsignedInteger('quantity');
            $table->string('location')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('total_amount', 12, 2);
            $table->timestamp('sold_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('inventory_products');
    }
};
