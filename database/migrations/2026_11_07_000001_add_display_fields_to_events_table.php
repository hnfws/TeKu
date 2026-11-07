<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('organizer_name')->nullable();
            $table->decimal('price', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['description', 'image_url', 'organizer_name', 'price']);
        });
    }
};
