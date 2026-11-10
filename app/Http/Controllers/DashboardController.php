<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\InventoryProduct;
use App\Models\LoanInstallment;
use App\Models\Sale;
use App\Models\TenantRegistration;
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
        $upcomingTenantBookingsQuery = TenantRegistration::query()
            ->join('event_tenants', 'tenant_registrations.tenant_id', '=', 'event_tenants.id')
            ->join('events', 'event_tenants.event_id', '=', 'events.id')
            ->where('tenant_registrations.user_id', $userId)
            ->whereNotNull('events.start_date')
            ->where('events.start_date', '>=', now());
        $closestUpcomingEventDate = (clone $upcomingTenantBookingsQuery)->min('events.start_date');
        $upcomingTenantBookings = $closestUpcomingEventDate
            ? $upcomingTenantBookingsQuery
                ->whereDate('events.start_date', Carbon::parse($closestUpcomingEventDate)->toDateString())
                ->orderBy('events.start_date')
                ->with('tenant.event:id,title,location_name,start_date')
                ->select('tenant_registrations.*')
                ->get()
                ->map(fn (TenantRegistration $registration) => [
                    'id' => $registration->id,
                    'event' => $registration->tenant?->event ? [
                        'id' => $registration->tenant->event->id,
                        'title' => $registration->tenant->event->title,
                        'location_name' => $registration->tenant->event->location_name,
                        'start_date' => Carbon::parse($registration->tenant->event->start_date, config('app.timezone'))->toIso8601String(),
                    ] : null,
                ])
                ->filter(fn (array $booking) => $booking['event'] !== null)
                ->values()
            : collect();

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
            'tenantRegistrations' => TenantRegistration::query()
                ->with('tenant.event')
                ->where('user_id', $userId)
                ->latest('registered_at')
                ->limit(3)
                ->get()
                ->map(fn (TenantRegistration $registration) => [
                    'id' => $registration->id,
                    'tenant_id' => $registration->tenant_id,
                    'tenant_type' => $registration->tenant?->tenant_type,
                    'event' => $registration->tenant?->event,
                ])
                ->filter(fn (array $registration) => $registration['event'] !== null)
                ->values(),
            'calendarEvents' => TenantRegistration::query()
                ->with('tenant.event:id,title,start_date')
                ->where('user_id', $userId)
                ->whereHas('tenant.event', fn ($query) => $query->whereBetween('start_date', [now()->startOfMonth(), now()->endOfMonth()]))
                ->get()
                ->map(fn (TenantRegistration $registration) => $registration->tenant?->event)
                ->filter()
                ->unique('id')
                ->map(fn (Event $event) => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'start_date' => Carbon::parse($event->start_date)->toDateString(),
                ])
                ->values(),
            'upcomingTenantBookings' => $upcomingTenantBookings,
            'products' => InventoryProduct::query()
                ->where('user_id', $userId)
                ->orderByRaw('CASE WHEN stock_quantity = 0 THEN 0 WHEN stock_quantity <= min_stock THEN 1 ELSE 2 END')
                ->latest('updated_at')
                ->limit(5)
                ->get(),
        ]);
    }
}
