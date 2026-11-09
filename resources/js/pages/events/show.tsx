import { Link, useForm, usePage } from '@inertiajs/react';

import ManagementLayout from '@/layouts/management-layout';

type EventItem = {
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    location_name: string | null;
    start_date: string | null;
    end_date: string | null;
    image_url: string | null;
    organizer_name: string | null;
    source_account: string | null;
    price: number | string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    tenants?: {
        id: number;
        price: number | string | null;
        tenant_type: string;
        requirements: string | null;
        registration_link: string | null;
        instagram_post_url: string | null;
        deadline_date: string | null;
    }[];
};

interface EventShowProps {
    event: EventItem;
    isRegistered: boolean;
}

const dateLabel = (value: string | null) =>
    value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Jadwal belum tersedia';
const money = (value: number | string | null) =>
    value === null
        ? 'Gratis'
        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));

export default function EventShow({ event, isRegistered }: EventShowProps) {
    const form = useForm({});
    const flash = usePage<{ flash?: { success?: string } }>().props.flash;
    const coordinates = event.latitude && event.longitude ? `${event.latitude},${event.longitude}` : null;
    const tenantPrice = event.tenants?.find((tenant) => tenant.price !== null)?.price ?? null;
    const isTenantOpportunity = Boolean(event.source_account);

    return (
        <ManagementLayout title={event.title}>
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Link className="text-sm font-semibold text-[#52704d] hover:underline" href="/events">
                            <i className="fa-solid fa-arrow-left mr-2" />
                            Kembali ke daftar event
                        </Link>
                        <p className="mt-3 text-xs font-semibold tracking-wide text-[#688463] uppercase">{event.category || 'Event'}</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">{event.title}</h1>
                    </div>
                </header>
                {flash?.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {flash.success}
                    </div>
                )}
                <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
                    <div className="flex max-h-[440px] min-h-56 items-center justify-center overflow-hidden bg-[#e6ede1]">
                        {event.image_url ? (
                            <img alt={event.title} className="max-h-[440px] w-full object-cover" src={event.image_url} />
                        ) : (
                            <div className="flex flex-col items-center text-[#688463]">
                                <i className="fa-solid fa-ticket text-5xl" />
                                <span className="mt-3 text-sm font-medium">Gambar event belum tersedia</span>
                            </div>
                        )}
                    </div>
                    <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-12">
                        <section className="lg:col-span-8">
                            <h2 className="text-xl font-bold text-stone-900">Tentang Event</h2>
                            <p className="mt-4 text-sm leading-7 whitespace-pre-line text-stone-600">
                                {event.description || 'Informasi deskripsi event belum tersedia.'}
                            </p>
                            <div className="mt-7 space-y-4">
                                <div className="flex items-start gap-3">
                                    <i className="fa-solid fa-location-dot mt-0.5 w-5 text-center text-[#688463]" />
                                    <div>
                                        <p className="text-sm font-semibold text-stone-900">Lokasi Event</p>
                                        <p className="mt-1 text-sm text-stone-600">{event.location_name || 'Lokasi belum tersedia'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <i className="fa-regular fa-calendar mt-0.5 w-5 text-center text-[#688463]" />
                                    <div>
                                        <p className="text-sm font-semibold text-stone-900">Jadwal Event</p>
                                        <p className="mt-1 text-sm text-stone-600">{dateLabel(event.start_date)}</p>
                                        {event.end_date && <p className="mt-1 text-sm text-stone-500">Selesai: {dateLabel(event.end_date)}</p>}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <i className="fa-regular fa-user mt-0.5 w-5 text-center text-[#688463]" />
                                    <div>
                                        <p className="text-sm font-semibold text-stone-900">Penyelenggara</p>
                                        <p className="mt-1 text-sm text-stone-600">{event.organizer_name || 'Penyelenggara event'}</p>
                                    </div>
                                </div>
                            </div>
                            {event.tenants?.length ? (
                                <div className="mt-7 border-t border-stone-100 pt-5">
                                    <h3 className="font-bold text-stone-900">Informasi Tenant</h3>
                                    <div className="mt-3 space-y-3">
                                        {event.tenants.map((tenant) => (
                                            <article className="rounded-xl bg-stone-50 p-4" key={tenant.id}>
                                                <p className="text-sm font-semibold text-stone-900">
                                                    {tenant.tenant_type === 'curated_call' ? 'Pendaftaran tenant' : 'Sewa tenant'}
                                                </p>
                                                <p className="mt-1 text-sm text-stone-600">
                                                    Biaya tenant: {tenant.price === null ? 'Belum dicantumkan' : money(tenant.price)}
                                                </p>
                                                {tenant.deadline_date && (
                                                    <p className="mt-1 text-xs text-stone-500">
                                                        Batas pendaftaran: {dateLabel(tenant.deadline_date)}
                                                    </p>
                                                )}
                                                {tenant.requirements && (
                                                    <p className="mt-2 text-xs leading-5 whitespace-pre-line text-stone-600">{tenant.requirements}</p>
                                                )}
                                                {tenant.registration_link && (
                                                    <a
                                                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#52704d] hover:underline"
                                                        href={tenant.registration_link}
                                                        rel="noreferrer"
                                                        target="_blank"
                                                    >
                                                        Buka informasi pendaftaran <i className="fa-solid fa-arrow-up-right-from-square" />
                                                    </a>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </section>
                        <aside className="space-y-5 lg:col-span-4">
                            <section className="rounded-2xl bg-[#5d775a] p-5 text-white shadow-sm">
                                <p className="text-sm font-semibold">{isTenantOpportunity ? 'Biaya tenant' : 'Harga'}</p>
                                <p className="mt-1 text-2xl font-bold">
                                    {tenantPrice !== null ? money(tenantPrice) : isTenantOpportunity ? 'Belum dicantumkan' : money(event.price)}
                                </p>
                                <p className="mt-1 text-xs text-white/80">
                                    {event.start_date ? dateLabel(event.start_date) : 'Jadwal belum diumumkan'}
                                </p>
                                {isRegistered ? (
                                    <div className="mt-5 rounded-lg bg-white/15 px-4 py-3 text-center text-sm font-semibold">
                                        <i className="fa-solid fa-circle-check mr-2" />
                                        Anda sudah terdaftar
                                    </div>
                                ) : (
                                    <form
                                        className="mt-5"
                                        onSubmit={(submitEvent) => {
                                            submitEvent.preventDefault();
                                            form.post(`/events/${event.id}/register`, { onSuccess: () => form.reset() });
                                        }}
                                    >
                                        <button
                                            className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-stone-100 disabled:opacity-60"
                                            disabled={form.processing}
                                            type="submit"
                                        >
                                            {form.processing ? 'Mendaftarkan...' : 'Daftar Event'}
                                        </button>
                                        {Object.values(form.errors)
                                            .filter((error): error is string => typeof error === 'string')
                                            .map((error) => (
                                                <p className="mt-2 text-sm text-white" key={error}>
                                                    {error}
                                                </p>
                                            ))}
                                    </form>
                                )}
                            </section>
                            <section className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
                                <h2 className="px-1 pb-3 text-sm font-bold text-stone-900">Lokasi Event</h2>
                                <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-[#e6ede1]">
                                    <div
                                        className="absolute inset-0 opacity-60"
                                        style={{
                                            backgroundImage:
                                                'linear-gradient(30deg, transparent 47%, white 48%, white 51%, transparent 52%), linear-gradient(120deg, transparent 47%, white 48%, white 51%, transparent 52%)',
                                            backgroundSize: '56px 56px',
                                        }}
                                    />
                                    <div className="relative text-center">
                                        <i className="fa-solid fa-location-dot text-3xl text-red-500 drop-shadow" />
                                        <p className="mt-1 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-stone-700">
                                            {event.location_name || 'Lokasi event'}
                                        </p>
                                    </div>
                                    <span className="absolute right-2 bottom-1 rounded bg-white/80 px-1.5 py-0.5 text-[9px] text-stone-500">
                                        Peta lokasi
                                    </span>
                                </div>
                                {coordinates && (
                                    <a
                                        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#52704d] hover:underline"
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        <i className="fa-solid fa-arrow-up-right-from-square" /> Buka di Google Maps
                                    </a>
                                )}
                            </section>
                        </aside>
                    </div>
                </div>
            </div>
        </ManagementLayout>
    );
}
