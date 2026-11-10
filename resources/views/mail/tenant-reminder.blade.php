<h1>Pengingat jadwal tenant</h1>

<p>Anda sudah menandai pendaftaran tenant untuk event <strong>{{ $event->title }}</strong>.</p>

@if ($eventDate)
    <p>Event dimulai pada {{ $eventDate }} ({{ config('app.timezone') }}).</p>
@endif

<p>Lokasi: {{ $event->location_name }}</p>

<p><a href="{{ $eventUrl }}">Lihat detail event</a></p>
