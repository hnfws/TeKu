<h1>Pengingat event</h1>

<p>Anda terdaftar untuk mengikuti <strong>{{ $event->title }}</strong>.</p>

@if ($eventDate)
    <p>Event dimulai pada {{ $eventDate }} ({{ config('app.timezone') }}).</p>
@endif

<p>Lokasi: {{ $event->location_name }}</p>

<p><a href="{{ $eventUrl }}">Lihat detail event</a></p>
