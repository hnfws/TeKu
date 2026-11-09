<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventRegistration;
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
                ->withExists(['registrations as is_registered' => fn ($query) => $query
                    ->where('user_id', $request->user()->id)
                    ->where('status', 'registered')])
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
            'registeredEventIds' => EventRegistration::query()
                ->where('user_id', $request->user()->id)
                ->where('status', 'registered')
                ->pluck('event_id'),
        ]);
    }

    public function dashboard(Request $request): Response
    {
        $userId = $request->user()->id;
        $now = now();

        return Inertia::render('events/dashboard', [
            'registeredEvents' => EventRegistration::query()
                ->with('event')
                ->where('user_id', $userId)
                ->where('status', 'registered')
                ->latest('registered_at')
                ->paginate(3)
                ->withQueryString(),
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
        $event->load('tenants');

        return Inertia::render('events/show', [
            'event' => $event,
            'isRegistered' => $event->registrations()
                ->where('user_id', $request->user()->id)
                ->where('status', 'registered')
                ->exists(),
            'registrationClosed' => $event->tenants()
                ->whereNotNull('deadline_date')
                ->whereDate('deadline_date', '<', now()->toDateString())
                ->exists(),
        ]);
    }

    public function register(Request $request, Event $event): RedirectResponse
    {
        if ($event->tenants()
            ->whereNotNull('deadline_date')
            ->whereDate('deadline_date', '<', now()->toDateString())
            ->exists()) {
            return back()->with('error', 'Pendaftaran tenant sudah ditutup karena melewati batas waktu.');
        }

        $registration = EventRegistration::firstOrNew([
            'event_id' => $event->id,
            'user_id' => $request->user()->id,
        ]);
        $registration->forceFill([
            'status' => 'registered',
            'registered_at' => now(),
            'email_reminded_at' => null,
            'browser_reminded_at' => null,
        ])->save();

        return back()->with('success', 'Pendaftaran event berhasil disimpan.');
    }

    public function cancelRegistration(Request $request, Event $event): RedirectResponse
    {
        EventRegistration::query()
            ->where('event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'registered')
            ->update(['status' => 'cancelled']);

        return back()->with('success', 'Pendaftaran event berhasil dibatalkan.');
    }
}
