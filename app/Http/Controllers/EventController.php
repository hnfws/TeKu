<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Tenant;
use App\Models\TenantRegistration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function calendar(Request $request): Response
    {
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);
        $month = isset($validated['month'])
            ? Carbon::createFromFormat('!Y-m', $validated['month'])
            : now()->startOfMonth();
        $monthStart = $month->copy()->startOfMonth();
        $monthEnd = $month->copy()->endOfMonth();

        return Inertia::render('events/calendar', [
            'month' => $monthStart->format('Y-m'),
            'events' => Event::query()
                ->whereNotNull('start_date')
                ->whereNotNull('end_date')
                ->where('start_date', '<=', $monthEnd)
                ->where('end_date', '>=', $monthStart)
                ->withExists(['tenants as is_registered' => fn ($query) => $query
                    ->whereHas('registrations', fn ($registrations) => $registrations
                        ->where('user_id', $request->user()->id))])
                ->orderBy('start_date')
                ->get(['id', 'title', 'location_name', 'start_date', 'end_date'])
                ->map(fn (Event $event) => [
                    'id' => $event->id,
                    'title' => $event->title,
                    'location_name' => $event->location_name,
                    'start_date' => Carbon::parse($event->start_date, config('app.timezone'))->toIso8601String(),
                    'end_date' => Carbon::parse($event->end_date, config('app.timezone'))->toIso8601String(),
                    'is_registered' => (bool) $event->is_registered,
                ]),
            'pushPublicKey' => config('services.webpush.public_key'),
            'pushEnabled' => filled(config('services.webpush.public_key'))
                && filled(config('services.webpush.private_key'))
                && filled(config('services.webpush.subject')),
        ]);
    }

    public function index(Request $request): Response
    {
        $now = now();
        $events = Event::query()
            ->with(['tenants:id,event_id,price,tenant_type,deadline_date'])
            ->when($request->filled('search'), fn ($query) => $query->where('title', 'like', '%'.$request->string('search')->toString().'%'))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->query('category')))
            ->orderByRaw('CASE WHEN start_date IS NULL THEN 2 WHEN start_date >= ? THEN 0 ELSE 1 END', [$now])
            ->orderByRaw('CASE WHEN start_date >= ? THEN start_date END ASC', [$now])
            ->orderByRaw('CASE WHEN start_date < ? THEN start_date END DESC', [$now])
            ->orderByDesc('id')
            ->paginate(6)
            ->withQueryString();

        return Inertia::render('events/index', [
            'events' => $events,
            'filters' => $request->only(['search', 'category']),
            'categories' => Event::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category'),
            'registeredTenantIds' => TenantRegistration::query()
                ->where('user_id', $request->user()->id)
                ->pluck('tenant_id'),
        ]);
    }

    public function dashboard(Request $request): Response
    {
        $userId = $request->user()->id;
        $now = now();

        return Inertia::render('events/dashboard', [
            'tenantRegistrations' => TenantRegistration::query()
                ->with('tenant.event')
                ->where('user_id', $userId)
                ->latest('registered_at')
                ->paginate(3)
                ->withQueryString()
                ->through(fn (TenantRegistration $registration) => [
                    'id' => $registration->id,
                    'tenant_id' => $registration->tenant_id,
                    'tenant' => ['tenant_type' => $registration->tenant?->tenant_type],
                    'event' => $registration->tenant?->event,
                ]),
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
            'events' => Event::query()
                ->when($request->filled('category'), fn ($query) => $query->where('category', $request->query('category')))
                ->orderByRaw('CASE WHEN start_date IS NULL THEN 2 WHEN start_date >= ? THEN 0 ELSE 1 END', [$now])
                ->orderByRaw('CASE WHEN start_date >= ? THEN start_date END ASC', [$now])
                ->orderByRaw('CASE WHEN start_date < ? THEN start_date END DESC', [$now])
                ->orderByDesc('id')
                ->paginate(8)
                ->withQueryString(),
            'filters' => $request->only(['category']),
            'categories' => Event::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category'),
        ]);
    }

    public function show(Request $request, Event $event): Response
    {
        $event->load(['tenants' => fn ($query) => $query->withExists([
            'registrations as is_registered' => fn ($registrationQuery) => $registrationQuery
                ->where('user_id', $request->user()->id),
        ])]);
        $tenantIds = $event->tenants->pluck('id');
        $event->tenants->each(function ($tenant) use ($event) {
            $username = $this->instagramUsername($event);
            $tenant->setAttribute(
                'instagram_profile_url',
                $username ? 'https://www.instagram.com/'.rawurlencode($username).'/' : null,
            );
        });

        return Inertia::render('events/show', [
            'event' => $event,
            'tenantVouchers' => $request->user()->tekumodalVouchers()
                ->where('status', 'available')
                ->whereIn('type', ['tenant_discount_10', 'tenant_discount_20'])
                ->get(['id', 'code', 'type', 'discount_percentage', 'max_discount_amount'])
                ->map(fn ($voucher) => [
                    'id' => $voucher->id,
                    'code' => $voucher->code,
                    'type' => $voucher->type,
                    'discount_percentage' => $voucher->discount_percentage,
                    'max_discount_amount' => $voucher->max_discount_amount,
                    'title' => collect(config('tekumodal.rewards'))->firstWhere('type', $voucher->type)['title'],
                ]),
            'tenantPaymentMethods' => collect(config('tekumodal.payment_methods'))
                ->map(fn (string $code, string $label) => ['label' => $label, 'code' => $code])
                ->values(),
            'tenantBookings' => $request->user()->tenantBookings()
                ->with('tenant:id,event_id')
                ->whereIn('tenant_id', $tenantIds)
                ->latest()
                ->limit(5)
                ->get(['id', 'tenant_id', 'voucher_id', 'base_amount', 'discount_amount', 'amount', 'status', 'created_at'])
                ->map(fn ($booking) => [
                    'id' => $booking->id,
                    'tenant_id' => $booking->tenant_id,
                    'base_amount' => $booking->base_amount,
                    'discount_amount' => $booking->discount_amount,
                    'amount' => $booking->amount,
                    'status' => $booking->status,
                    'created_at' => $booking->created_at,
                ]),
        ]);
    }

    public function registerTenant(Request $request, Event $event, Tenant $tenant): RedirectResponse
    {
        abort_unless($tenant->event_id === $event->id, 404);

        if ($tenant->deadline_date && Carbon::parse($tenant->deadline_date)->toDateString() < now()->toDateString()) {
            return back()->with('error', 'Pendaftaran tenant sudah ditutup karena melewati batas waktu.');
        }

        $registration = TenantRegistration::firstOrCreate([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
        ], ['registered_at' => now()]);

        return back()->with(
            'success',
            $registration->wasRecentlyCreated
                ? 'Status pendaftaran tenant berhasil ditandai.'
                : 'Pendaftaran tenant ini sudah ditandai sebelumnya.',
        );
    }

    private function instagramUsername(Event $event): ?string
    {
        $username = trim((string) ($event->source_account ?: $event->organizer_name), " @\t\n\r\0\x0B");
        if (preg_match('/^[A-Za-z0-9._]{1,30}$/', $username)) {
            return $username;
        }

        $postUrl = $event->tenants->first()?->instagram_post_url;
        if (! $postUrl) {
            return null;
        }

        $host = parse_url($postUrl, PHP_URL_HOST);
        $path = trim((string) parse_url($postUrl, PHP_URL_PATH), '/');
        $segments = explode('/', $path);
        $candidate = $segments[0] ?? '';

        return in_array($host, ['instagram.com', 'www.instagram.com'], true)
            && preg_match('/^[A-Za-z0-9._]{1,30}$/', $candidate)
            ? $candidate
            : null;
    }
}
