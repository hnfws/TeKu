<?php

use App\Models\Promotion;
use App\Models\User;

test('users can create and manage promotions from the promo page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get('/promotions')->assertInertia(fn ($page) => $page
        ->component('promotions/index')
        ->where('metrics.total', 0)
        ->where('metrics.active', 0));

    $this->post('/promotions', [
        'code' => 'hemat10',
        'discount_type' => 'percent',
        'discount_value' => 10,
        'minimum_purchase' => 50000,
        'maximum_discount' => 20000,
        'starts_at' => now()->subMinute()->format('Y-m-d H:i:s'),
        'ends_at' => now()->addDays(7)->format('Y-m-d H:i:s'),
    ])->assertRedirect('/promotions')
        ->assertSessionHas('success');

    $promotion = Promotion::query()->where('user_id', $user->id)->firstOrFail();
    expect($promotion->code)->toBe('HEMAT10')
        ->and($promotion->is_active)->toBeTrue()
        ->and((float) $promotion->discount_value)->toBe(10.0)
        ->and((float) $promotion->minimum_purchase)->toBe(50000.0)
        ->and((float) $promotion->maximum_discount)->toBe(20000.0);

    $this->put("/promotions/{$promotion->id}", [
        'code' => 'DISKON20',
        'discount_type' => 'amount',
        'discount_value' => 15000,
        'minimum_purchase' => 0,
        'maximum_discount' => '',
        'starts_at' => '',
        'ends_at' => '',
        'is_active' => false,
    ])->assertRedirect('/promotions');
    expect($promotion->fresh()->code)->toBe('DISKON20')
        ->and($promotion->fresh()->is_active)->toBeFalse()
        ->and((float) $promotion->fresh()->discount_value)->toBe(15000.0);

    $this->patch("/promotions/{$promotion->id}/toggle")->assertRedirect('/promotions');
    expect($promotion->fresh()->is_active)->toBeTrue();

    $this->delete("/promotions/{$promotion->id}")->assertRedirect('/promotions');
    expect(Promotion::query()->count())->toBe(0);
});

test('promotion codes are unique per user without case sensitivity and discounts are validated', function () {
    $user = User::factory()->create();
    Promotion::create([
        'user_id' => $user->id,
        'code' => 'HEMAT10',
        'discount_type' => 'percent',
        'discount_value' => 10,
        'minimum_purchase' => 0,
        'is_active' => true,
    ]);

    $this->actingAs($user)->from('/promotions')->post('/promotions', [
        'code' => 'hemat10',
        'discount_type' => 'percent',
        'discount_value' => 10,
    ])->assertRedirect('/promotions')->assertSessionHasErrors('code');

    $this->post('/promotions', [
        'code' => 'TERLALU BESAR',
        'discount_type' => 'percent',
        'discount_value' => 101,
    ])->assertRedirect('/promotions')->assertSessionHasErrors('discount_value');

    expect(Promotion::query()->count())->toBe(1);
});

test('blank minimum purchase is stored as zero when creating or updating a promotion', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/promotions', [
        'code' => 'TANPAMINIMUM',
        'discount_type' => 'percent',
        'discount_value' => 5,
        'minimum_purchase' => '',
    ])->assertRedirect('/promotions')->assertSessionHasNoErrors();

    $promotion = Promotion::query()->where('code', 'TANPAMINIMUM')->firstOrFail();
    expect((float) $promotion->minimum_purchase)->toBe(0.0);

    $this->put("/promotions/{$promotion->id}", [
        'code' => 'TANPAMINIMUM',
        'discount_type' => 'percent',
        'discount_value' => 5,
        'minimum_purchase' => '',
        'maximum_discount' => '',
        'starts_at' => '',
        'ends_at' => '',
        'is_active' => true,
    ])->assertRedirect('/promotions')->assertSessionHasNoErrors();

    expect((float) $promotion->fresh()->minimum_purchase)->toBe(0.0);
});

test('promotion dates submitted as UTC instants are stored without shifting their selected time', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/promotions', [
        'code' => 'TANGGALLOKAL',
        'discount_type' => 'percent',
        'discount_value' => 10,
        'starts_at' => '2026-11-09T12:53:00.000Z',
        'ends_at' => '2026-11-11T12:53:00.000Z',
    ])->assertRedirect('/promotions')->assertSessionHasNoErrors();

    $promotion = Promotion::query()->where('code', 'TANGGALLOKAL')->firstOrFail();
    expect($promotion->starts_at->toIso8601String())->toBe('2026-11-09T12:53:00+00:00')
        ->and($promotion->ends_at->toIso8601String())->toBe('2026-11-11T12:53:00+00:00');
});

test('promotion records and actions are scoped to their owner', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $promotion = Promotion::create([
        'user_id' => $owner->id,
        'code' => 'PUNYAOWNER',
        'discount_type' => 'amount',
        'discount_value' => 5000,
        'minimum_purchase' => 0,
        'is_active' => true,
    ]);

    $this->actingAs($otherUser)->get('/promotions')->assertInertia(fn ($page) => $page
        ->has('promotions.data', 0)
        ->where('metrics.total', 0));
    $this->put("/promotions/{$promotion->id}", [
        'code' => 'DIUBAH',
        'discount_type' => 'amount',
        'discount_value' => 1000,
    ])->assertNotFound();
    $this->patch("/promotions/{$promotion->id}/toggle")->assertNotFound();
    $this->delete("/promotions/{$promotion->id}")->assertNotFound();

    expect($promotion->fresh()->code)->toBe('PUNYAOWNER');
});

test('promo status filters separate scheduled, expired and disabled records', function () {
    $user = User::factory()->create();
    $scheduled = Promotion::create([
        'user_id' => $user->id,
        'code' => 'NANTI',
        'discount_type' => 'percent',
        'discount_value' => 5,
        'minimum_purchase' => 0,
        'is_active' => true,
        'starts_at' => now()->addDay(),
    ]);
    $expired = Promotion::create([
        'user_id' => $user->id,
        'code' => 'LEWAT',
        'discount_type' => 'percent',
        'discount_value' => 5,
        'minimum_purchase' => 0,
        'is_active' => true,
        'ends_at' => now()->subDay(),
    ]);
    $disabled = Promotion::create([
        'user_id' => $user->id,
        'code' => 'NONAKTIF',
        'discount_type' => 'percent',
        'discount_value' => 5,
        'minimum_purchase' => 0,
        'is_active' => false,
    ]);

    $this->actingAs($user)->get('/promotions?status=scheduled')->assertInertia(fn ($page) => $page
        ->has('promotions.data', 1)->where('promotions.data.0.id', $scheduled->id));
    $this->get('/promotions?status=expired')->assertInertia(fn ($page) => $page
        ->has('promotions.data', 1)->where('promotions.data.0.id', $expired->id));
    $this->get('/promotions?status=inactive')->assertInertia(fn ($page) => $page
        ->has('promotions.data', 1)->where('promotions.data.0.id', $disabled->id));
});
