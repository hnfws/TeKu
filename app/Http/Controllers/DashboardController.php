<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\InventoryProduct;
use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $userId = $request->user()->id;
        $today = now()->startOfDay();
        $month = now()->startOfMonth();

        return Inertia::render('dashboard', [
            'metrics' => [
                'dailySales' => Sale::where('user_id', $userId)->where('sold_at', '>=', $today)->sum('total_amount'),
                'monthlySales' => Sale::where('user_id', $userId)->where('sold_at', '>=', $month)->sum('total_amount'),
                'stockUnits' => InventoryProduct::where('user_id', $userId)->sum('stock_quantity'),
                'productCount' => InventoryProduct::where('user_id', $userId)->count(),
            ],
            'registeredEvents' => EventRegistration::query()
                ->with('event')
                ->where('user_id', $userId)
                ->where('status', 'registered')
                ->latest('registered_at')
                ->limit(3)
                ->get()
                ->pluck('event')
                ->filter()
                ->values(),
            'calendarEvents' => EventRegistration::query()
                ->with('event:id,title,start_date')
                ->where('user_id', $userId)
                ->where('status', 'registered')
                ->whereHas('event', fn ($query) => $query->whereBetween('start_date', [now()->startOfMonth(), now()->endOfMonth()]))
                ->get()
                ->map(fn (EventRegistration $registration) => $registration->event)
                ->filter()
                ->map(fn (Event $event) => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'start_date' => \Illuminate\Support\Carbon::parse($event->start_date)->toDateString(),
                ])
                ->values(),
            'products' => InventoryProduct::query()
                ->where('user_id', $userId)
                ->orderByRaw('CASE WHEN stock_quantity = 0 THEN 0 WHEN stock_quantity <= min_stock THEN 1 ELSE 2 END')
                ->latest('updated_at')
                ->limit(5)
                ->get(),
        ]);
    }
}
