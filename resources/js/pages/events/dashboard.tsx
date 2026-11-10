import { Link, router, usePage } from '@inertiajs/react';

import DashboardCalendar from '@/components/dashboard-calendar';
import ManagementLayout from '@/layouts/management-layout';
import { eventCategoryLabel } from '@/lib/event-category';

type EventItem = {
    id: number;
    title: string;
    category: string | null;
    location_name: string | null;
    start_date: string | null;
    image_url: string | null;
    organizer_name: string | null;
    price: number | string | null;
};
type TenantRegistration = { id: number; tenant_id: number; tenant: { tenant_type: string } | null; event: EventItem | null };
type CalendarEvent = { id: number; title: string; start_date: string | null };
interface EventsDashboardProps {
    tenantRegistrations: { data: TenantRegistration[]; links: { url: string | null; label: string; active: boolean }[] };
    calendarEvents: CalendarEvent[];
    events: { data: EventItem[]; total: number };
    filters: { category?: string };
    categories: string[];
}

const dateLabel = (value: string | null) =>
    value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Jadwal belum tersedia';

export default function EventsDashboard({ tenantRegistrations, calendarEvents, events, filters, categories }: EventsDashboardProps) {
    const flash = usePage<{ flash?: { success?: string } }>().props.flash;
    return (
        <ManagementLayout title="Event Dashboard">
            <div className="mx-auto max-w-[1440px] space-y-7">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-[#688463]">Agenda dan rekomendasi</p>
                        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-950">Events</h1>
                    </div>
                    <Link
                        className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                        href="/events"
                    >
                        Daftar Event
                    </Link>
                </header>
                {flash?.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {flash.success}
                    </div>
                )}
                <div className="grid items-start gap-6 xl:grid-cols-12">
                    <section className="space-y-4 xl:col-span-8">
                        <div className="flex items-end justify-between">
                            <div>
                                <h2 className="font-bold text-stone-900">Pendaftaran Tenant Saya</h2>
                                <p className="mt-1 text-xs text-stone-500">Tenant yang sudah kamu tandai telah didaftarkan</p>
                            </div>
                        </div>
                        {tenantRegistrations.data
                            .filter((registration) => registration.event)
                            .map(
                                ({ id, tenant, event }) =>
                                    event && (
                                        <Link
                                            className="flex flex-col gap-3 rounded-xl border border-stone-100 bg-white p-3.5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                                            href={`/events/${event.id}`}
                                            key={id}
                                        >
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                                                    {event.image_url ? (
                                                        <img alt="" className="h-full w-full object-cover" src={event.image_url} />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-stone-300">
                                                            <i className="fa-solid fa-ticket text-xl" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <h3 className="line-clamp-2 text-sm font-bold text-stone-900">{event.title}</h3>
                                                    <p className="text-xs text-stone-500">
                                                        <i className="fa-regular fa-calendar mr-2" />
                                                        {dateLabel(event.start_date)}
                                                    </p>
                                                    <p className="truncate text-xs text-stone-500">
                                                        <i className="fa-solid fa-location-dot mr-2" />
                                                        {event.location_name || 'Lokasi belum tersedia'}
                                                    </p>
                                                    <p className="text-[11px] text-stone-400">
                                                        Oleh {event.organizer_name || 'Penyelenggara event'} ·{' '}
                                                        {tenant?.tenant_type === 'curated_call' ? 'Pendaftaran tenant' : 'Sewa tenant'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="self-end rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white sm:self-center">
                                                Terdaftar tenant
                                            </span>
                                        </Link>
                                    ),
                            )}
                        {!tenantRegistrations.data.some((registration) => registration.event) && (
                            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-7 text-center">
                                <p className="font-semibold text-stone-700">Belum ada pendaftaran tenant</p>
                                <p className="mt-1 text-sm text-stone-500">
                                    Pilih event untuk mulai menghubungi penyelenggara dan mendaftar sebagai tenant.
                                </p>
                            </div>
                        )}
                        <nav aria-label="Halaman pendaftaran tenant" className="flex justify-end gap-1">
                            {tenantRegistrations.links.map((link, index) =>
                                link.url ? (
                                    <Link
                                        className="rounded-md bg-white px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
                                        href={link.url}
                                        key={`${link.label}-${index}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : null,
                            )}
                        </nav>
                    </section>
                    <div className="min-w-0 xl:col-span-4">
                        <DashboardCalendar events={calendarEvents} />
                    </div>
                </div>

                <section className="flex flex-wrap gap-2" aria-label="Filter kategori event">
                    <button
                        className={`rounded-xl border px-4 py-2 text-xs font-semibold ${!filters.category ? 'border-[#688463] bg-[#688463] text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`}
                        onClick={() => router.get('/event-dashboard', {}, { preserveState: true, preserveScroll: true, replace: true })}
                        type="button"
                    >
                        Semua
                    </button>
                    {categories.map((category) => (
                        <button
                            className={`rounded-xl border px-4 py-2 text-xs font-semibold ${filters.category === category ? 'border-[#688463] bg-[#688463] text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`}
                            key={category}
                            onClick={() => router.get('/event-dashboard', { category }, { preserveState: true, preserveScroll: true, replace: true })}
                            type="button"
                        >
                            {eventCategoryLabel(category)}
                        </button>
                    ))}
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-stone-900">Daftar Event</h2>
                            <p className="mt-1 text-xs text-stone-500">{events.total} rekomendasi event</p>
                        </div>
                        <Link className="text-sm font-semibold text-stone-600 hover:text-stone-900" href="/events">
                            Lihat event lainnya <i className="fa-solid fa-chevron-right ml-1 text-[10px]" />
                        </Link>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {events.data.map((event) => (
                            <article
                                className="flex flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm transition hover:shadow-md"
                                key={event.id}
                            >
                                <Link className="h-36 overflow-hidden bg-stone-100" href={`/events/${event.id}`}>
                                    {event.image_url ? (
                                        <img
                                            alt=""
                                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                            src={event.image_url}
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-stone-300">
                                            <i className="fa-solid fa-ticket text-3xl" />
                                        </div>
                                    )}
                                </Link>
                                <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
                                    <div>
                                        <p className="mb-2 inline-flex rounded-md bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                                            {event.price === null
                                                ? 'Gratis'
                                                : new Intl.NumberFormat('id-ID', {
                                                      style: 'currency',
                                                      currency: 'IDR',
                                                      maximumFractionDigits: 0,
                                                  }).format(Number(event.price))}
                                        </p>
                                        <h3 className="line-clamp-2 text-sm leading-snug font-bold text-stone-900">{event.title}</h3>
                                    </div>
                                    <div className="space-y-1.5 text-[11px] text-stone-500">
                                        <p>
                                            <i className="fa-regular fa-calendar mr-2 text-stone-400" />
                                            {dateLabel(event.start_date)}
                                        </p>
                                        <p className="truncate">
                                            <i className="fa-solid fa-location-dot mr-2 text-stone-400" />
                                            {event.location_name || 'Lokasi belum tersedia'}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                        {!events.data.length && (
                            <p className="rounded-xl bg-white p-8 text-sm text-stone-500 sm:col-span-2 lg:col-span-4">
                                Belum ada event yang tersedia untuk kategori ini.
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </ManagementLayout>
    );
}
