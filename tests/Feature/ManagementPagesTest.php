<?php

use App\Models\Event;
use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use App\Models\Tenant;
use App\Models\TenantRegistration;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

test('participant event registrations are replaced by tenant registrations', function () {
    expect(Schema::hasTable('event_registrations'))->toBeFalse()
        ->and(Schema::hasTable('tenant_registrations'))->toBeTrue();
});

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

    $imageUrl = Storage::disk('public')->url($product->fresh()->image_path);
    $this->actingAs($user)->get('/inventory')
        ->assertInertia(fn ($page) => $page
            ->component('inventory/index')
            ->where('products.data.0.image_url', $imageUrl));
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

test('users can mark tenant registration once and see it on their dashboards', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'title' => 'Festival Tenant',
        'category' => 'bazaar',
        'location_name' => 'Jakarta',
        'start_date' => now()->startOfMonth()->addDays(7),
        'end_date' => now()->startOfMonth()->addDays(7)->addHours(3),
        'latitude' => -6.2,
        'longitude' => 106.8,
        'source_account' => 'festivaltenant',
    ]);
    $tenant = Tenant::create([
        'event_id' => $event->id,
        'tenant_type' => 'curated_call',
        'deadline_date' => now()->addDays(5),
        'instagram_post_url' => 'https://www.instagram.com/festivaltenant/p/test-post/',
    ]);

    $this->actingAs($user)
        ->from("/events/{$event->id}")
        ->post("/events/{$event->id}/tenants/{$tenant->id}/registrations")
        ->assertRedirect("/events/{$event->id}");

    $this->post("/events/{$event->id}/tenants/{$tenant->id}/registrations")
        ->assertRedirect("/events/{$event->id}");
    $this->get("/events/{$event->id}")->assertInertia(fn ($page) => $page
        ->where('event.tenants.0.is_registered', true)
        ->where('event.tenants.0.instagram_profile_url', 'https://www.instagram.com/festivaltenant/'));

    expect(TenantRegistration::query()
        ->where('user_id', $user->id)
        ->where('tenant_id', $tenant->id)
        ->count())->toBe(1);

    $this->get('/event-dashboard')->assertInertia(fn ($page) => $page
        ->component('events/dashboard')
        ->has('tenantRegistrations.data', 1)
        ->has('calendarEvents', 1)
        ->where('calendarEvents.0.id', $event->id));
    $this->get('/dashboard')->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('tenantRegistrations', 1)
        ->has('calendarEvents', 1)
        ->where('calendarEvents.0.id', $event->id)
        ->has('upcomingTenantBookings', 0));
});

test('dashboard shows upcoming dates for registered tenant bookings', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'title' => 'Bazaar Akhir Pekan',
        'category' => 'bazaar',
        'location_name' => 'Jakarta',
        'start_date' => now()->addDays(3)->setTime(10, 30),
        'end_date' => now()->addDays(3)->setTime(18, 0),
        'latitude' => -6.2,
        'longitude' => 106.8,
    ]);
    $tenant = Tenant::create(['event_id' => $event->id, 'tenant_type' => 'curated_call']);
    TenantRegistration::create(['tenant_id' => $tenant->id, 'user_id' => $user->id]);

    $this->actingAs($user)->get('/dashboard')->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('upcomingTenantBookings', 1)
        ->where('upcomingTenantBookings.0.event.id', $event->id)
        ->where('upcomingTenantBookings.0.event.title', 'Bazaar Akhir Pekan')
        ->where('upcomingTenantBookings.0.event.location_name', 'Jakarta'));
});

test('users cannot mark tenant registration after that tenant deadline', function () {
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
    $tenant = Tenant::create([
        'event_id' => $event->id,
        'tenant_type' => 'curated_call',
        'deadline_date' => now()->subDay(),
    ]);

    $this->actingAs($user)
        ->from("/events/{$event->id}")
        ->post("/events/{$event->id}/tenants/{$tenant->id}/registrations")
        ->assertRedirect("/events/{$event->id}")
        ->assertSessionHas('error');

    expect(TenantRegistration::query()
        ->where('user_id', $user->id)
        ->where('tenant_id', $tenant->id)
        ->exists())->toBeFalse();

    $this->get("/events/{$event->id}")->assertInertia(fn ($page) => $page
        ->where('event.tenants.0.is_registered', false));
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

test('calendar shows dated events for the requested month with tenant registration status', function () {
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
    $response = $this->actingAs($user)
        ->get('/calendar?month='.$month->format('Y-m'));
    $response->assertOk()->assertInertia(fn ($page) => $page
        ->component('events/calendar')
        ->where('month', $month->format('Y-m'))
        ->has('events', 1)
        ->where('events.0.id', $event->id)
        ->where('events.0.is_registered', false));
});

test('calendar marks events with a registered tenant', function () {
    $user = User::factory()->create();
    $event = Event::create([
        'title' => 'Pasar Kreatif',
        'category' => 'bazaar',
        'location_name' => 'Bandung',
        'start_date' => now()->addDays(3),
        'end_date' => now()->addDays(3)->addHours(4),
        'latitude' => -6.9,
        'longitude' => 107.6,
    ]);
    $tenant = Tenant::create(['event_id' => $event->id, 'tenant_type' => 'curated_call']);
    TenantRegistration::create(['tenant_id' => $tenant->id, 'user_id' => $user->id]);

    $this->actingAs($user)->get('/calendar')->assertInertia(fn ($page) => $page
        ->where('events.0.id', $event->id)
        ->where('events.0.is_registered', true));
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
