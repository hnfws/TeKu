<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\InventoryProduct;
use App\Models\LoanInstallment;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $userId = $request->user()->id;
        $today = now()->startOfDay();
        $month = now()->startOfMonth();
        $nextMonth = now()->startOfMonth()->addMonthNoOverflow();

        return Inertia::render('dashboard', [
            'metrics' => [
                'dailySales' => Sale::where('user_id', $userId)->where('sold_at', '>=', $today)->sum('total_amount'),
                'monthlySales' => Sale::where('user_id', $userId)->where('sold_at', '>=', $month)->sum('total_amount'),
                'nextMonthBills' => LoanInstallment::query()
                    ->whereHas('loanApplication', fn ($query) => $query
                        ->where('user_id', $userId)
                        ->whereIn('status', ['simulation_active', 'completed']))
                    ->where('status', '!=', 'paid')
                    ->whereBetween('due_date', [$nextMonth->toDateString(), $nextMonth->copy()->endOfMonth()->toDateString()])
                    ->sum('amount'),
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
                    'start_date' => Carbon::parse($event->start_date)->toDateString(),
                ])
                ->values(),
            'upcomingEventReminders' => Event::query()
                ->whereHas('registrations', fn ($query) => $query
                    ->where('user_id', $userId)
                    ->where('status', 'registered'))
                ->whereNotNull('start_date')
                ->where('start_date', '>=', now())
                ->orderBy('start_date')
                ->limit(5)
                ->get(['id', 'title', 'location_name', 'start_date'])
                ->map(fn (Event $event) => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'location_name' => $event->location_name,
                    'start_date' => Carbon::parse($event->start_date)->toIso8601String(),
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
