<?php

use App\Models\Event;
use App\Models\TeKuModalVoucher;
use App\Models\Tenant;
use App\Models\TenantBooking;
use App\Models\User;
use App\Services\MidtransSandboxGateway;
use Illuminate\Support\Str;

function createDirectRentTenant(int $price = 2_000_000): Tenant
{
    $event = Event::create([
        'title' => 'Festival Tenant',
        'category' => 'bazaar',
        'location_name' => 'Jakarta',
        'start_date' => now()->addDays(10),
        'end_date' => now()->addDays(10)->addHours(4),
        'latitude' => -6.2,
        'longitude' => 106.8,
        'source_account' => 'event.organizer',
    ]);

    return Tenant::create([
        'event_id' => $event->id,
        'tenant_type' => 'direct_rent',
        'price' => $price,
        'deadline_date' => now()->addDays(5),
    ]);
}

function createTenantVoucher(User $user, array $overrides = []): TeKuModalVoucher
{
    return TeKuModalVoucher::create(array_merge([
        'user_id' => $user->id,
        'code' => 'TEKU-'.Str::upper(Str::random(12)),
        'type' => 'tenant_discount_10',
        'points_cost' => 120,
        'discount_percentage' => 10,
        'max_discount_amount' => 300_000,
        'status' => 'available',
        'claimed_at' => now(),
    ], $overrides));
}

test('tenant checkout applies an owned voucher and marks it used after Midtrans settles', function () {
    $user = User::factory()->create();
    $tenant = createDirectRentTenant();
    $voucher = createTenantVoucher($user);
    $checkoutUrl = 'https://app.sandbox.midtrans.com/snap/v4/redirection/tenant-test';
    $gateway = Mockery::mock(MidtransSandboxGateway::class);
    $gateway->shouldReceive('createTenantBookingRedirectUrl')->once()->andReturn($checkoutUrl);
    $gateway->shouldReceive('verifyNotificationSignature')->once()->andReturn(true);
    app()->instance(MidtransSandboxGateway::class, $gateway);

    $this->actingAs($user)
        ->withHeader('X-Inertia', 'true')
        ->post("/events/{$tenant->event_id}/tenants/{$tenant->id}/bookings", [
            'payment_method' => 'bca_va',
            'voucher_id' => $voucher->id,
        ])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', $checkoutUrl);

    $booking = TenantBooking::query()->firstOrFail();
    expect($booking->base_amount)->toBe(2_000_000)
        ->and($booking->discount_amount)->toBe(200_000)
        ->and($booking->amount)->toBe(1_800_000)
        ->and($booking->status)->toBe('pending')
        ->and($voucher->fresh()->status)->toBe('reserved');

    $notification = [
        'order_id' => $booking->order_id,
        'status_code' => '200',
        'gross_amount' => '1800000.00',
        'signature_key' => 'verified-by-mock',
        'transaction_status' => 'settlement',
        'transaction_id' => 'tenant-provider-transaction',
    ];
    $this->postJson('/api/midtrans/notifications', $notification)
        ->assertOk()
        ->assertJson(['received' => true]);

    expect($booking->fresh()->status)->toBe('paid')
        ->and($booking->fresh()->provider_transaction_id)->toBe('tenant-provider-transaction')
        ->and($voucher->fresh()->status)->toBe('used');
});

test('tenant checkout enforces the voucher cap and releases a voucher after failed payment', function () {
    $user = User::factory()->create();
    $tenant = createDirectRentTenant(5_000_000);
    $voucher = createTenantVoucher($user, ['discount_percentage' => 20, 'max_discount_amount' => 600_000]);
    $checkoutUrl = 'https://app.sandbox.midtrans.com/snap/v4/redirection/tenant-test';
    $gateway = Mockery::mock(MidtransSandboxGateway::class);
    $gateway->shouldReceive('createTenantBookingRedirectUrl')->once()->andReturn($checkoutUrl);
    $gateway->shouldReceive('verifyNotificationSignature')->once()->andReturn(true);
    app()->instance(MidtransSandboxGateway::class, $gateway);

    $this->actingAs($user)
        ->withHeader('X-Inertia', 'true')
        ->post("/events/{$tenant->event_id}/tenants/{$tenant->id}/bookings", [
            'payment_method' => 'qris',
            'voucher_id' => $voucher->id,
        ])
        ->assertStatus(409);

    $booking = TenantBooking::query()->firstOrFail();
    expect($booking->discount_amount)->toBe(600_000)
        ->and($booking->amount)->toBe(4_400_000);

    $this->postJson('/api/midtrans/notifications', [
        'order_id' => $booking->order_id,
        'status_code' => '202',
        'gross_amount' => '4400000.00',
        'signature_key' => 'verified-by-mock',
        'transaction_status' => 'expire',
        'transaction_id' => 'tenant-provider-expired',
    ])->assertOk();

    expect($booking->fresh()->status)->toBe('expired')
        ->and($voucher->fresh()->status)->toBe('available');
});

test('tenant checkout rejects a voucher owned by another user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $tenant = createDirectRentTenant();
    $voucher = createTenantVoucher($otherUser);
    $gateway = Mockery::mock(MidtransSandboxGateway::class);
    $gateway->shouldNotReceive('createTenantBookingRedirectUrl');
    app()->instance(MidtransSandboxGateway::class, $gateway);

    $this->actingAs($user)
        ->from("/events/{$tenant->event_id}")
        ->post("/events/{$tenant->event_id}/tenants/{$tenant->id}/bookings", [
            'payment_method' => 'bca_va',
            'voucher_id' => $voucher->id,
        ])
        ->assertRedirect("/events/{$tenant->event_id}")
        ->assertSessionHasErrors('voucher_id');

    expect(TenantBooking::query()->count())->toBe(0)
        ->and($voucher->fresh()->status)->toBe('available');
});
