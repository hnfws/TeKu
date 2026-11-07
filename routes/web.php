<?php

use App\Http\Controllers\Api\ScraperController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\EventRadarController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\SalesController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('calendar', [EventController::class, 'calendar'])->name('calendar');
    Route::post('calendar/push-subscriptions', [PushSubscriptionController::class, 'store'])->name('calendar.push-subscriptions.store');
    Route::delete('calendar/push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('calendar.push-subscriptions.destroy');

    Route::get('events', [EventController::class, 'index'])->name('events.index');
    Route::get('event-dashboard', [EventController::class, 'dashboard'])->name('events.dashboard');
    Route::get('events/{event}', [EventController::class, 'show'])->whereNumber('event')->name('events.show');
    Route::post('events/{event}/register', [EventController::class, 'register'])->whereNumber('event')->name('events.register');

    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::get('inventory/create', [InventoryController::class, 'create'])->name('inventory.create');
    Route::post('inventory', [InventoryController::class, 'store'])->name('inventory.store');
    Route::get('inventory/{product}/edit', [InventoryController::class, 'edit'])->whereNumber('product')->name('inventory.edit');
    Route::put('inventory/{product}', [InventoryController::class, 'update'])->whereNumber('product')->name('inventory.update');
    Route::delete('inventory/{product}', [InventoryController::class, 'destroy'])->whereNumber('product')->name('inventory.destroy');
    Route::post('inventory/{product}/stock', [InventoryController::class, 'adjustStock'])->whereNumber('product')->name('inventory.stock');

    Route::get('promotions', [PromotionController::class, 'index'])->name('promotions.index');
    Route::post('promotions', [PromotionController::class, 'store'])->name('promotions.store');
    Route::put('promotions/{promotion}', [PromotionController::class, 'update'])->whereNumber('promotion')->name('promotions.update');
    Route::patch('promotions/{promotion}/toggle', [PromotionController::class, 'toggle'])->whereNumber('promotion')->name('promotions.toggle');
    Route::delete('promotions/{promotion}', [PromotionController::class, 'destroy'])->whereNumber('promotion')->name('promotions.destroy');

    Route::get('sales/pos', [SalesController::class, 'pos'])->name('sales.pos');
    Route::get('sales/report', [SalesController::class, 'report'])->name('sales.report');
    Route::get('sales', [SalesController::class, 'index'])->name('sales.index');
    Route::post('sales/promotion', [SalesController::class, 'applyPromotion'])->name('sales.promotion');
    Route::post('sales', [SalesController::class, 'store'])->name('sales.store');
    Route::get('sales/{sale}', [SalesController::class, 'show'])->whereNumber('sale')->name('sales.show');
});

Route::post('/scraped-events', [ScraperController::class, 'store'])
    ->middleware('scraper.token'); // Menggunakan middleware token yang sudah kita buat

Route::get('/radar', [EventRadarController::class, 'index'])->name('radar');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
