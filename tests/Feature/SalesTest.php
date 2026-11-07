<?php

use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use App\Models\Promotion;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;

function createSaleProduct(User $user, array $attributes = []): InventoryProduct
{
    return InventoryProduct::create(array_merge([
        'user_id' => $user->id,
        'name' => 'Kopi Susu',
        'sku' => 'KS-001',
        'category' => 'Minuman',
        'unit' => 'cup',
        'stock_quantity' => 10,
        'min_stock' => 1,
        'cost_price' => 5000,
        'selling_price' => 20000,
    ], $attributes));
}

test('sales pages render database-backed screens', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/sales')->assertInertia(fn ($page) => $page
        ->component('sales/index')
        ->has('sales.data', 0)
        ->where('metrics.today', 0));
    $this->get('/sales/pos')->assertInertia(fn ($page) => $page
        ->component('sales/pos')
        ->has('products', 0)
        ->where('promotionsAvailable', false));
    $this->get('/sales/report')->assertInertia(fn ($page) => $page
        ->component('sales/report')
        ->has('chart', 6)
        ->has('chart.0.series', 0));
});

test('sales report groups monthly revenue by its three top products', function () {
    $user = User::factory()->create();
    $soldAt = now()->startOfMonth()->addDays(2);

    foreach ([
        ['name' => 'Cimol Original', 'amount' => 100000],
        ['name' => 'Cimol Keju', 'amount' => 90000],
        ['name' => 'Cimol Pedas', 'amount' => 80000],
        ['name' => 'Air Mineral', 'amount' => 10000],
    ] as $index => $product) {
        $sale = Sale::create([
            'user_id' => $user->id,
            'transaction_code' => 'TEKU'.str_pad((string) ($index + 1), 9, '0', STR_PAD_LEFT),
            'subtotal' => $product['amount'],
            'discount_amount' => 0,
            'total_amount' => $product['amount'],
            'sold_at' => $soldAt,
        ]);
        SaleItem::create([
            'sale_id' => $sale->id,
            'product_name' => $product['name'],
            'category' => 'Makanan',
            'quantity' => 1,
            'unit_price' => $product['amount'],
            'line_total' => $product['amount'],
        ]);
    }

    $this->actingAs($user)->get('/sales/report')->assertInertia(fn ($page) => $page
        ->where('chart.5.month', now()->format('Y-m'))
        ->where('chart.5.series.0.name', 'Cimol Original')
        ->where('chart.5.series.0.revenue', 100000)
        ->has('chart.5.series', 3)
        ->where('metrics.totalRevenue', 280000));
});

test('checkout records sale items and stock movement atomically', function () {
    $user = User::factory()->create();
    $product = createSaleProduct($user);

    $this->actingAs($user)->post('/sales', [
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
        'customer_name' => 'Nadia Putri',
        'payment_method' => 'qris',
        'notes' => 'Tanpa es',
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();
    expect($sale->transaction_code)->toBe('TEKU'.str_pad((string) $sale->id, 9, '0', STR_PAD_LEFT))
        ->and((float) $sale->subtotal)->toBe(40000.0)
        ->and((float) $sale->total_amount)->toBe(40000.0)
        ->and($sale->items)->toHaveCount(1)
        ->and($product->fresh()->stock_quantity)->toBe(8);

    $this->assertDatabaseHas('sale_items', [
        'sale_id' => $sale->id,
        'inventory_product_id' => $product->id,
        'product_name' => 'Kopi Susu',
        'quantity' => 2,
        'line_total' => 40000,
    ]);
    $this->assertDatabaseHas('inventory_movements', [
        'inventory_product_id' => $product->id,
        'user_id' => $user->id,
        'type' => 'out',
        'quantity' => 2,
    ]);
});

test('checkout rejects other users products and insufficient stock', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $product = createSaleProduct($owner, ['stock_quantity' => 1]);

    $this->actingAs($otherUser)
        ->from('/sales/pos')
        ->post('/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ])
        ->assertRedirect('/sales/pos')
        ->assertSessionHasErrors('items');

    $this->actingAs($owner)
        ->from('/sales/pos')
        ->post('/sales', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ])
        ->assertRedirect('/sales/pos')
        ->assertSessionHasErrors('items');

    expect(Sale::query()->count())->toBe(0)
        ->and(InventoryMovement::query()->count())->toBe(0)
        ->and($product->fresh()->stock_quantity)->toBe(1);
});

test('only active database promotions are applied at checkout', function () {
    $user = User::factory()->create();
    $product = createSaleProduct($user);
    Promotion::create([
        'user_id' => $user->id,
        'code' => 'HEMAT10',
        'discount_type' => 'percent',
        'discount_value' => 10,
        'minimum_purchase' => 0,
        'is_active' => true,
    ]);

    $this->actingAs($user)->postJson('/sales/promotion', [
        'code' => 'hemat10',
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
    ])->assertOk()->assertJson([
        'code' => 'HEMAT10',
        'discount' => 4000,
    ]);

    $this->actingAs($user)->post('/sales', [
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
        'payment_method' => 'cash',
        'promo_code' => 'HEMAT10',
    ])->assertRedirect();

    $sale = Sale::query()->firstOrFail();
    expect((float) $sale->discount_amount)->toBe(4000.0)
        ->and((float) $sale->total_amount)->toBe(36000.0);

    Promotion::query()->where('code', 'HEMAT10')->update(['is_active' => false]);
    $this->actingAs($user)->postJson('/sales/promotion', [
        'code' => 'HEMAT10',
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
    ])->assertUnprocessable();
});

test('sale details are private to the transaction owner', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $sale = Sale::create([
        'user_id' => $owner->id,
        'transaction_code' => 'TEKU000000001',
        'subtotal' => 10000,
        'discount_amount' => 0,
        'total_amount' => 10000,
        'sold_at' => now(),
    ]);
    SaleItem::create([
        'sale_id' => $sale->id,
        'product_name' => 'Produk',
        'quantity' => 1,
        'unit_price' => 10000,
        'line_total' => 10000,
    ]);

    $this->actingAs($owner)->get("/sales/{$sale->id}")
        ->assertInertia(fn ($page) => $page->component('sales/show')->has('sale.items', 1));
    $this->actingAs($otherUser)->get("/sales/{$sale->id}")->assertNotFound();
});
