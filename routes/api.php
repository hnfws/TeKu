<?php

use App\Http\Controllers\Api\ScraperController;
use App\Http\Controllers\TeKuModalPaymentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/scraped-events', [ScraperController::class, 'store'])
    ->middleware('scraper.token');

Route::middleware('scraper.token')->prefix('scraped-events')->group(function () {
    Route::get('/known-posts', [ScraperController::class, 'knownPosts']);
    Route::post('/seen-posts', [ScraperController::class, 'markPostsSeen']);
});

Route::post('/midtrans/notifications', [TeKuModalPaymentController::class, 'notification'])
    ->name('tekumodal.midtrans.notification');
