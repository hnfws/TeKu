<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('event_registrations');

        Schema::create('tenant_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('event_tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamps();

            $table->unique(['tenant_id', 'user_id']);
            $table->index(['user_id', 'registered_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_registrations');

        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 30)->default('registered');
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamp('email_reminded_at')->nullable();
            $table->timestamp('browser_reminded_at')->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'user_id']);
            $table->index(['user_id', 'status']);
        });
    }
};
