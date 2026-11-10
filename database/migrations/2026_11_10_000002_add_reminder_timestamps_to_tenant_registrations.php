<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_registrations', function (Blueprint $table) {
            $table->timestamp('email_reminded_at')->nullable();
            $table->timestamp('browser_reminded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('tenant_registrations', function (Blueprint $table) {
            $table->dropColumn(['email_reminded_at', 'browser_reminded_at']);
        });
    }
};
