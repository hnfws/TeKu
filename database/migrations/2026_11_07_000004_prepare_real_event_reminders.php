<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dateTime('start_date')->nullable()->change();
            $table->dateTime('end_date')->nullable()->change();
        });

        DB::table('events')
            ->whereNotNull('source_account')
            ->update(['start_date' => null, 'end_date' => null]);

        Schema::table('event_registrations', function (Blueprint $table) {
            $table->timestamp('email_reminded_at')->nullable();
            $table->timestamp('browser_reminded_at')->nullable();
        });

        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('endpoint');
            $table->char('endpoint_hash', 64)->unique();
            $table->text('public_key');
            $table->text('auth_token');
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');

        Schema::table('event_registrations', function (Blueprint $table) {
            $table->dropColumn(['email_reminded_at', 'browser_reminded_at']);
        });

    }
};
