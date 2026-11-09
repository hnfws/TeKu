<?php

use App\Mail\EventReminderMail;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

test('users can create inventory and the initial stock is recorded', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->post('/inventory', [
        'name' => 'Air Mineral',
        'sku' => 'AM-001',
        'category' => 'Minuman',
        'unit' => 'botol',
        'stock_quantity' => 12,
        'min_stock' => 3,
        'cost_price' => 2000,
        'selling_price' => 4000,
    ]);

    $response->assertRedirect('/inventory');
    $product = InventoryProduct::query()->where('user_id', $user->id)->firstOrFail();
    expect($product->name)->toBe('Air Mineral');
    $this->assertDatabaseHas('inventory_movements', [
        'inventory_product_id' => $product->id,
        'user_id' => $user->id,
        'type' => 'in',
        'quantity' => 12,
    ]);
});

test('users can update inventory through a multipart form with an image', function () {
    Storage::fake('public');
    $user = User::factory()->create();
    $product = InventoryProduct::create([
        'user_id' => $user->id,
        'name' => 'Nama Lama',
        'sku' => 'ITEM-001',
        'category' => 'Lainnya',
        'unit' => 'pcs',
        'stock_quantity' => 5,
        'min_stock' => 1,
        'cost_price' => 1000,
        'selling_price' => 2000,
    ]);

    $this->actingAs($user)->post("/inventory/{$product->id}", [
        '_method' => 'put',
        'name' => 'Nama Baru',
        'sku' => 'ITEM-001',
        'category' => 'Makanan',
        'unit' => 'pcs',
        'stock_quantity' => 8,
        'min_stock' => 2,
        'cost_price' => 3000,
        'selling_price' => 5000,
        'image' => UploadedFile::fake()->image('product.jpg'),
    ])->assertRedirect('/inventory');

    expect($product->fresh()->name)->toBe('Nama Baru')
        ->and($product->fresh()->stock_quantity)->toBe(8)
        ->and($product->fresh()->image_path)->not->toBeNull();
});

test('inventory edit provides production and expiration dates in date input format', function () {
    $user = User::factory()->create();
    $product = InventoryProduct::create([
        'user_id' => $user->id,
        'name' => 'Produk Bertanggal',
        'sku' => 'DATE-001',
        'category' => 'Makanan',
        'unit' => 'pcs',
        'stock_quantity' => 5,
        'min_stock' => 1,
        'cost_price' => 1000,
        'selling_price' => 2000,
        'production_date' => '2026-10-01',
        'expiration_date' => '2026-12-01',
    ]);

    $this->actingAs($user)->get("/inventory/{$product->id}/edit")
        ->assertInertia(fn ($page) => $page
            ->component('inventory/form')
            ->where('product.production_date', '2026-10-01')
            ->where('product.expiration_date', '2026-12-01'));
});

test('authenticated users can open the management pages', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/dashboard')->assertOk();
    $this->get('/inventory')->assertOk();
    $this->get('/events')->assertOk();
    $this->get('/event-dashboard')->assertOk();
});

test('inventory stock cannot be reduced below zero and products are user scoped', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $product = InventoryProduct::create([
        'user_id' => $owner->id,
        'name' => 'Kopi',
        'sku' => 'KP-001',
        'category' => 'Minuman',
        'unit' => 'cup',
        'stock_quantity' => 2,
        'min_stock' => 1,
        'cost_price' => 1000,
        'selling_price' => 3000,
    ]);

    $this->actingAs($owner)
        ->from('/inventory')
        ->post("/inventory/{$product->id}/stock", ['quantity' => -3])
        ->assertRedirect('/inventory')
        ->assertSessionHasErrors('quantity');
    expect($product->fresh()->stock_quantity)->toBe(2);
    expect(InventoryMovement::query()->count())->toBe(0);

    $this->actingAs($otherUser)->get("/inventory/{$product->id}/edit")->assertNotFound();
});

test('users can register for an event only once', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'title' => 'Festival Musik',
        'category' => 'music',
        'location_name' => 'Jakarta',
        'start_date' => now()->startOfMonth()->addDays(7),
        'end_date' => now()->startOfMonth()->addDays(7)->addHours(3),
        'latitude' => -6.2,
        'longitude' => 106.8,
    ]);

    $this->actingAs($user)
        ->from("/events/{$event->id}")
        ->post("/events/{$event->id}/register")
        ->assertRedirect("/events/{$event->id}");

    $this->post("/events/{$event->id}/register")->assertRedirect("/events/{$event->id}");
    $this->get("/events/{$event->id}")->assertOk();

    expect(EventRegistration::query()
        ->where('user_id', $user->id)
        ->where('event_id', $event->id)
        ->count())->toBe(1);

    $this->get('/event-dashboard')->assertInertia(fn ($page) => $page
        ->component('events/dashboard')
        ->has('calendarEvents', 1)
        ->where('calendarEvents.0.id', $event->id));
    $this->get('/dashboard')->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('calendarEvents', 1)
        ->where('calendarEvents.0.id', $event->id));
});

test('users cannot register for tenant opportunities after the deadline', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'title' => 'Tenant Bazaar',
        'category' => 'bazaar',
        'location_name' => 'Jakarta',
        'start_date' => now()->addDays(10),
        'end_date' => now()->addDays(10)->addHours(4),
        'latitude' => -6.2,
        'longitude' => 106.8,
        'source_account' => 'info.tenant',
    ]);
    Tenant::create([
        'event_id' => $event->id,
        'tenant_type' => 'curated_call',
        'deadline_date' => now()->subDay(),
    ]);

    $this->actingAs($user)
        ->from("/events/{$event->id}")
        ->post("/events/{$event->id}/register")
        ->assertRedirect("/events/{$event->id}")
        ->assertSessionHas('error');

    expect(EventRegistration::query()
        ->where('user_id', $user->id)
        ->where('event_id', $event->id)
        ->exists())->toBeFalse();

    $this->get("/events/{$event->id}")->assertInertia(fn ($page) => $page
        ->where('registrationClosed', true)
        ->where('isRegistered', false));
});

test('users can cancel an event registration', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'title' => 'Festival Musik',
        'category' => 'music',
        'location_name' => 'Jakarta',
        'start_date' => now()->addDays(10),
        'end_date' => now()->addDays(10)->addHours(3),
        'latitude' => -6.2,
        'longitude' => 106.8,
    ]);
    EventRegistration::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'status' => 'registered',
        'registered_at' => now(),
    ]);

    $this->actingAs($user)
        ->from("/events/{$event->id}")
        ->delete("/events/{$event->id}/register")
        ->assertRedirect("/events/{$event->id}");

    $this->assertDatabaseHas('event_registrations', [
        'event_id' => $event->id,
        'user_id' => $user->id,
        'status' => 'cancelled',
    ]);
});

test('event lists show nearest upcoming dates before later ones', function () {
    $user = User::factory()->create();
    $laterEvent = Event::create([
        'title' => 'Tenant 5 November',
        'category' => 'bazaar',
        'location_name' => 'Jakarta',
        'start_date' => now()->startOfDay()->addDays(8),
        'end_date' => now()->startOfDay()->addDays(8)->addHours(4),
        'latitude' => -6.2,
        'longitude' => 106.8,
    ]);
    $nearestEvent = Event::create([
        'title' => 'Tenant 28 January',
        'category' => 'bazaar',
        'location_name' => 'Jakarta',
        'start_date' => now()->startOfDay()->addDay(),
        'end_date' => now()->startOfDay()->addDay()->addHours(4),
        'latitude' => -6.2,
        'longitude' => 106.8,
    ]);

    $this->actingAs($user)->get('/events')->assertInertia(fn ($page) => $page
        ->where('events.data.0.id', $nearestEvent->id)
        ->where('events.data.1.id', $laterEvent->id));

    $this->get('/event-dashboard')->assertInertia(fn ($page) => $page
        ->where('events.data.0.id', $nearestEvent->id)
        ->where('events.data.1.id', $laterEvent->id));
});

test('dashboard shows upcoming schedules for registered events', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'title' => 'Bazaar Akhir Pekan',
        'category' => 'bazaar',
        'location_name' => 'Jakarta',
        'start_date' => now()->addDays(2)->setTime(18, 30),
        'end_date' => now()->addDays(2)->setTime(21, 0),
        'latitude' => -6.2,
        'longitude' => 106.8,
    ]);
    EventRegistration::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'status' => 'registered',
        'registered_at' => now(),
    ]);

    $this->actingAs($user)->get('/dashboard')->assertInertia(fn ($page) => $page
        ->has('upcomingEventReminders', 1)
        ->where('upcomingEventReminders.0.title', $event->title)
        ->where('upcomingEventReminders.0.location_name', 'Jakarta'));
});

test('calendar shows dated events for the requested month and marks registrations', function () {
    $user = User::factory()->create();
    $month = now()->addMonth()->startOfMonth();
    $event = Event::create([
        'title' => 'Pasar Kreatif',
        'category' => 'bazaar',
        'location_name' => 'Bandung',
        'start_date' => $month->copy()->addDays(3),
        'end_date' => $month->copy()->addDays(3)->addHours(4),
        'latitude' => -6.9,
        'longitude' => 107.6,
    ]);
    EventRegistration::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'status' => 'registered',
        'registered_at' => now(),
    ]);

    $response = $this->actingAs($user)
        ->get('/calendar?month='.$month->format('Y-m'));
    $response->assertOk()->assertInertia(fn ($page) => $page
        ->component('events/calendar')
        ->where('month', $month->format('Y-m'))
        ->has('events', 1)
        ->where('events.0.id', $event->id)
        ->where('events.0.is_registered', true));
});

test('push subscriptions are scoped to their owner', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $subscription = [
        'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        'keys' => ['p256dh' => 'public-key', 'auth' => 'auth-token'],
    ];

    $this->actingAs($owner)->postJson('/calendar/push-subscriptions', $subscription)->assertOk();
    $this->actingAs($otherUser)->postJson('/calendar/push-subscriptions', $subscription)->assertStatus(409);
    $this->actingAs($otherUser)->deleteJson('/calendar/push-subscriptions', [
        'endpoint' => $subscription['endpoint'],
    ])->assertOk();

    $this->assertDatabaseHas('push_subscriptions', [
        'user_id' => $owner->id,
        'endpoint_hash' => hash('sha256', $subscription['endpoint']),
    ]);

    $this->actingAs($owner)->postJson('/calendar/push-subscriptions', [
        ...$subscription,
        'endpoint' => 'https://localhost/internal-service',
    ])->assertUnprocessable();
});

test('event reminder email is sent only once within the 24 hour window', function () {
    Mail::fake();
    config()->set('mail.default', 'smtp');
    $user = User::factory()->create();
    $event = Event::create([
        'title' => 'Festival Musik',
        'category' => 'music',
        'location_name' => 'Jakarta',
        'start_date' => now()->addHours(23),
        'end_date' => now()->addHours(26),
        'latitude' => -6.2,
        'longitude' => 106.8,
    ]);
    $registration = EventRegistration::create([
        'event_id' => $event->id,
        'user_id' => $user->id,
        'status' => 'registered',
        'registered_at' => now(),
    ]);

    $this->artisan('events:send-reminders')->assertSuccessful();
    $this->artisan('events:send-reminders')->assertSuccessful();

    Mail::assertSent(EventReminderMail::class, 1);
    expect($registration->fresh()->email_reminded_at)->not->toBeNull();
});

test('scraped event dates remain empty unless the scraper supplies event dates', function () {
    config()->set('services.scraper.token', 'test-token');
    config()->set('app.timezone', 'UTC');

    $this->withToken('test-token')->postJson('/api/scraped-events', [
        'title' => 'Panggilan Tenant',
        'description' => 'Pendaftaran tenant dibuka.',
        'location_name' => 'Jakarta',
        'latitude' => -6.2,
        'longitude' => 106.8,
        'instagram_post_url' => 'https://instagram.com/p/test-post',
        'account_name' => 'eventjakarta',
    ])->assertOk();

    $event = Event::query()->where('title', 'Panggilan Tenant')->firstOrFail();
    expect($event->start_date)->toBeNull()
        ->and($event->end_date)->toBeNull();

    $this->withToken('test-token')->postJson('/api/scraped-events', [
        'title' => 'Festival Jakarta',
        'location_name' => 'Jakarta',
        'latitude' => -6.2,
        'longitude' => 106.8,
        'instagram_post_url' => 'https://instagram.com/p/dated-event',
        'account_name' => 'eventjakarta',
        'start_date' => '2026-11-12T10:00:00+07:00',
        'end_date' => '2026-11-12T12:00:00+07:00',
    ])->assertOk();

    $datedEvent = Event::query()->where('title', 'Festival Jakarta')->firstOrFail();
    expect($datedEvent->start_date)->toBe('2026-11-12 03:00:00')
        ->and($datedEvent->end_date)->toBe('2026-11-12 05:00:00');
});
