import { Link, router } from '@inertiajs/react';

import ManagementLayout from '@/layouts/management-layout';

type EventItem = {
    id: number;
    title: string;
    category: string | null;
    location_name: string | null;
    start_date: string | null;
    image_url: string | null;
    organizer_name: string | null;
    source_account: string | null;
    price: number | string | null;
    tenants: { id: number; price: number | string | null; tenant_type: string }[];
};

interface EventsIndexProps {
    events: {
        data: EventItem[];
        links: { url: string | null; label: string; active: boolean }[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: { search?: string; category?: string };
    registeredEventIds: number[];
    categories: string[];
}

const dateLabel = (value: string | null) =>
    value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Jadwal belum tersedia';
const priceLabel = (price: string | number | null) =>
    price === null
        ? 'Gratis'
        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(price));

export default function EventsIndex({ events, filters, registeredEventIds, categories }: EventsIndexProps) {
    return (
        <ManagementLayout title="Daftar Event">
            <div className="mx-auto max-w-[1360px] space-y-6">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-sm font-semibold text-[#688463]">Temukan kegiatan menarik</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">Events</h1>
                    </div>
                    <form action="/events" className="flex w-full max-w-md gap-2" method="get">
                        {filters.category && <input name="category" type="hidden" value={filters.category} />}
                        <label className="relative min-w-0 flex-1">
                            <span className="sr-only">Cari event</span>
                            <i className="fa-solid fa-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-xs text-stone-400" />
                            <input
                                className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pr-3 pl-9 text-sm focus:border-[#688463] focus:ring-2 focus:ring-[#688463]/20 focus:outline-none"
                                defaultValue={filters.search}
                                name="search"
                                placeholder="Cari nama event..."
                            />
                        </label>
                        <button className="rounded-lg bg-[#3e5638] px-4 py-2 text-sm font-semibold text-white hover:bg-[#33472e]" type="submit">
                            Cari
                        </button>
                    </form>
                </header>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs font-semibold text-stone-500">Kategori:</span>
                    <button
                        className={`rounded-full border px-3 py-1.5 text-xs ${!filters.category ? 'border-[#688463] bg-[#688463] text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}
                        onClick={() =>
                            router.get('/events', { search: filters.search }, { preserveState: true, preserveScroll: true, replace: true })
                        }
                        type="button"
                    >
                        Semua
                    </button>
                    {categories.slice(0, 8).map((category) => (
                        <button
                            className={`rounded-full border px-3 py-1.5 text-xs ${filters.category === category ? 'border-[#688463] bg-[#688463] text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}
                            key={category}
                            onClick={() =>
                                router.get(
                                    '/events',
                                    { search: filters.search, category },
                                    { preserveState: true, preserveScroll: true, replace: true },
                                )
                            }
                            type="button"
                        >
                            {category}
                        </button>
                    ))}
                    {!categories.length && <span className="text-xs text-stone-400">Kategori belum tersedia.</span>}
                </div>

                <div className="grid gap-6 xl:grid-cols-12">
                    <section className="space-y-4 xl:col-span-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-stone-900">Daftar Event</h2>
                                <p className="mt-1 text-xs text-stone-500">{events.total} event tersedia</p>
                            </div>
                            <Link className="text-sm font-semibold text-[#52704d] hover:underline" href="/event-dashboard">
                                Event Dashboard
                            </Link>
                        </div>
                        {events.data.map((event) => {
                            const registered = registeredEventIds.includes(event.id);
                            const tenantPrice = event.tenants.find((tenant) => tenant.price !== null)?.price ?? null;
                            const isTenantOpportunity = Boolean(event.source_account);
                            const displayedPrice = tenantPrice ?? event.price;
                            return (
                                <article
                                    className="flex flex-col gap-4 rounded-xl border border-stone-200/70 bg-white p-3.5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                                    key={event.id}
                                >
                                    <Link className="flex min-w-0 flex-1 items-center gap-4" href={`/events/${event.id}`}>
                                        <div className="h-[78px] w-[124px] shrink-0 overflow-hidden rounded-lg bg-stone-100">
                                            {event.image_url ? (
                                                <img alt="" className="h-full w-full object-cover" src={event.image_url} />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-stone-300">
                                                    <i className="fa-solid fa-ticket text-2xl" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <h3 className="line-clamp-2 text-sm font-bold text-stone-900">{event.title}</h3>
                                            <p className="text-xs text-stone-600">
                                                <i className="fa-regular fa-calendar mr-2 text-stone-400" />
                                                {dateLabel(event.start_date)}
                                            </p>
                                            <p className="truncate text-xs text-stone-600">
                                                <i className="fa-solid fa-location-dot mr-2 text-stone-400" />
                                                {event.location_name || 'Lokasi belum tersedia'}
                                            </p>
                                            <p className="text-[11px] text-stone-400">
                                                Oleh {event.organizer_name || 'Penyelenggara event'}
                                                {event.category ? ` · ${event.category}` : ''}
                                            </p>
                                        </div>
                                    </Link>
                                    <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                                        <span className="text-right text-sm font-bold text-stone-900">
                                            {displayedPrice === null && isTenantOpportunity
                                                ? 'Harga tenant belum dicantumkan'
                                                : priceLabel(displayedPrice)}
                                            {tenantPrice !== null && (
                                                <span className="block text-[10px] font-medium text-stone-500">Biaya tenant</span>
                                            )}
                                        </span>
                                        <Link
                                            className={`rounded-md px-4 py-2 text-xs font-semibold transition ${registered ? 'bg-emerald-50 text-emerald-700' : 'bg-[#c8401c] text-white hover:bg-[#b03716]'}`}
                                            href={`/events/${event.id}`}
                                        >
                                            {registered ? 'Terdaftar' : 'Detail Event'}
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                        {!events.data.length && (
                            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
                                <i className="fa-regular fa-calendar-xmark text-3xl text-stone-300" />
                                <p className="mt-3 font-semibold text-stone-700">Event tidak ditemukan</p>
                                <p className="mt-1 text-sm text-stone-500">Coba kata kunci pencarian lain.</p>
                            </div>
                        )}
                        <nav aria-label="Halaman daftar event" className="flex flex-wrap justify-end gap-1">
                            {events.links.map((link, index) =>
                                link.url ? (
                                    <Link
                                        className={`rounded-md px-3 py-1.5 text-xs ${link.active ? 'bg-[#688463] font-semibold text-white' : 'bg-white text-stone-600 hover:bg-stone-100'}`}
                                        href={link.url}
                                        key={`${link.label}-${index}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        aria-disabled="true"
                                        className="rounded-md bg-white px-3 py-1.5 text-xs text-stone-300"
                                        key={`${link.label}-${index}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </nav>
                    </section>
                    <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm xl:col-span-4">
                        <h2 className="font-bold text-stone-900">Pendaftaran Event</h2>
                        <p className="mt-2 text-sm leading-6 text-stone-500">
                            Buka detail event untuk melihat informasi lengkap dan mendaftarkan diri. Event yang Anda daftarkan tersimpan di akun.
                        </p>
                        <Link
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#688463] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5d765a]"
                            href="/event-dashboard"
                        >
                            <i className="fa-solid fa-ticket" /> Event Terdaftar
                        </Link>
                    </aside>
                </div>
            </div>
        </ManagementLayout>
    );
}
