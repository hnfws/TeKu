<?php

use App\Mail\TenantReminderMail;
use App\Models\Event;
use App\Models\Tenant;
use App\Models\TenantRegistration;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

function createTenantReminderEvent(array $overrides = []): Event
{
    return Event::create(array_merge([
        'title' => 'Bazaar Akhir Pekan',
        'category' => 'bazaar',
        'location_name' => 'Jakarta',
        'start_date' => now()->addHours(12),
        'end_date' => now()->addHours(16),
        'latitude' => -6.2,
        'longitude' => 106.8,
    ], $overrides));
}

test('tenant reminder command emails users marked registered within the next 24 hours once', function () {
    Mail::fake();
    config(['mail.default' => 'smtp']);

    $user = User::factory()->create();
    $event = createTenantReminderEvent();
    $tenant = Tenant::create([
        'event_id' => $event->id,
        'tenant_type' => 'curated_call',
    ]);
    $registration = TenantRegistration::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'registered_at' => now(),
    ]);
    $unregisteredEvent = createTenantReminderEvent([
        'title' => 'Event tanpa tenant terdaftar',
    ]);
    Tenant::create([
        'event_id' => $unregisteredEvent->id,
        'tenant_type' => 'curated_call',
    ]);

    $this->artisan('tenants:send-reminders')->assertSuccessful();
    $this->artisan('tenants:send-reminders')->assertSuccessful();

    Mail::assertSent(TenantReminderMail::class, 1);
    expect($registration->fresh()->email_reminded_at)->not->toBeNull();
});

test('tenant reminder command ignores schedules more than 24 hours away', function () {
    Mail::fake();
    config(['mail.default' => 'smtp']);

    $user = User::factory()->create();
    $event = createTenantReminderEvent([
        'start_date' => now()->addHours(25),
        'end_date' => now()->addHours(29),
    ]);
    $tenant = Tenant::create([
        'event_id' => $event->id,
        'tenant_type' => 'curated_call',
    ]);
    $registration = TenantRegistration::create([
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'registered_at' => now(),
    ]);

    $this->artisan('tenants:send-reminders')->assertSuccessful();

    Mail::assertNothingSent();
    expect($registration->fresh()->email_reminded_at)->toBeNull();
});
