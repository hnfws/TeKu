import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

import ManagementLayout from '@/layouts/management-layout';
import { eventCategoryLabel } from '@/lib/event-category';

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
        instagram_profile_url: string | null;
        deadline_date: string | null;
        is_registered: boolean;
    }[];
};

interface EventShowProps {
    event: EventItem;
    tenantVouchers: {
        id: number;
        code: string;
        type: string;
        discount_percentage: number;
        max_discount_amount: number | null;
        title: string;
    }[];
    tenantPaymentMethods: { label: string; code: string }[];
    tenantBookings: {
        id: number;
        tenant_id: number;
        base_amount: number;
        discount_amount: number;
        amount: number;
        status: string;
        created_at: string;
    }[];
}

const dateLabel = (value: string | null) =>
    value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Jadwal belum tersedia';
const money = (value: number | string | null) =>
    value === null
        ? 'Gratis'
        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));

export default function EventShow({ event, tenantVouchers, tenantPaymentMethods, tenantBookings }: EventShowProps) {
    const flash = usePage<{ flash?: { success?: string; error?: string } }>().props.flash;
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
                        <p className="mt-3 text-xs font-semibold tracking-wide text-[#688463] uppercase">{eventCategoryLabel(event.category)}</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">{event.title}</h1>
                    </div>
                </header>
                {flash?.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                        {flash.error}
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
                                                {tenant.tenant_type === 'direct_rent' && tenant.price !== null && (
                                                    <TenantRentalCheckout
                                                        eventId={event.id}
                                                        tenant={tenant}
                                                        vouchers={tenantVouchers}
                                                        paymentMethods={tenantPaymentMethods}
                                                        bookings={tenantBookings.filter((booking) => booking.tenant_id === tenant.id)}
                                                    />
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
                                {event.tenants?.length ? (
                                    <div className="mt-5 space-y-3">
                                        {event.tenants.map((tenant) => (
                                            <TenantRegistrationAction
                                                eventId={event.id}
                                                eventTitle={event.title}
                                                key={tenant.id}
                                                tenant={tenant}
                                                vouchers={tenantVouchers}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-5 rounded-lg bg-white/15 px-4 py-3 text-center text-sm">
                                        Informasi pendaftaran tenant belum tersedia untuk event ini.
                                    </p>
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

type TenantItem = NonNullable<EventItem['tenants']>[number];

function TenantRegistrationAction({
    eventId,
    eventTitle,
    tenant,
    vouchers,
}: {
    eventId: number;
    eventTitle: string;
    tenant: TenantItem;
    vouchers: EventShowProps['tenantVouchers'];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [voucherId, setVoucherId] = useState<number | null>(vouchers[0]?.id ?? null);
    const [copyMessage, setCopyMessage] = useState('');
    const form = useForm({});
    const selectedVoucher = vouchers.find((voucher) => voucher.id === voucherId);
    const message = [
        `Halo, saya tertarik mendaftar sebagai tenant untuk ${eventTitle}.`,
        'Mohon informasi biaya, persyaratan, dan langkah pendaftarannya.',
        ...(selectedVoucher ? [`Kode voucher TeKuModal saya: ${selectedVoucher.code}`] : []),
    ].join('\n');

    const copyMessageToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopyMessage('Pesan berhasil disalin. Tempelkan di DM Instagram.');
        } catch {
            setCopyMessage('Pesan tidak dapat disalin otomatis. Pilih dan salin teks pesan secara manual.');
        }
    };

    if (tenant.is_registered) {
        return (
            <button className="w-full cursor-default rounded-full bg-white/90 px-4 py-3 text-sm font-semibold text-[#3e5638]" disabled type="button">
                <i className="fa-solid fa-circle-check mr-2" /> Terdaftar sebagai tenant
            </button>
        );
    }

    const isClosed = tenant.deadline_date !== null && new Date(tenant.deadline_date).getTime() < new Date().setHours(0, 0, 0, 0);

    return (
        <>
            <button
                className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-white/80"
                disabled={isClosed}
                onClick={() => setIsOpen(true)}
                type="button"
            >
                {isClosed ? 'Pendaftaran tenant ditutup' : 'Booking Tenant'}
            </button>
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setIsOpen(false);
                    }}
                >
                    <section
                        aria-labelledby={`tenant-booking-title-${tenant.id}`}
                        aria-modal="true"
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
                        role="dialog"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-stone-900" id={`tenant-booking-title-${tenant.id}`}>
                                    Booking Tenant
                                </h2>
                                <p className="mt-1 text-sm text-stone-600">{eventTitle}</p>
                            </div>
                            <button
                                aria-label="Tutup"
                                className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
                                onClick={() => setIsOpen(false)}
                                type="button"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-stone-600">
                            Salin format pesan, lalu buka profil Instagram penyelenggara dan tekan Pesan. Kalau biaya belum dicantumkan, tanyakan
                            biaya dan persyaratannya.
                        </p>
                        <p className="mt-2 text-xs leading-5 text-stone-500">
                            Pesan tidak dikirim otomatis. Tempelkan format yang sudah disalin di DM Instagram.
                        </p>
                        {vouchers.length > 0 && (
                            <label className="mt-5 block text-sm font-semibold text-stone-800">
                                Sertakan voucher TeKuModal (opsional)
                                <select
                                    className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal"
                                    onChange={(event) => setVoucherId(event.target.value ? Number(event.target.value) : null)}
                                    value={voucherId ?? ''}
                                >
                                    <option value="">Tidak menyertakan voucher</option>
                                    {vouchers.map((voucher) => (
                                        <option key={voucher.id} value={voucher.id}>
                                            {voucher.title} · {voucher.code}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <p className="mb-2 text-xs font-semibold text-stone-700">Contoh pesan DM</p>
                            <pre className="font-sans text-sm leading-6 whitespace-pre-wrap text-stone-700">{message}</pre>
                            <button
                                className="mt-3 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                                onClick={copyMessageToClipboard}
                                type="button"
                            >
                                Salin pesan
                            </button>
                            {copyMessage && (
                                <p className="mt-2 text-xs text-stone-600" role="status">
                                    {copyMessage}
                                </p>
                            )}
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {tenant.instagram_profile_url ? (
                                <a
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#52704d] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#40583b]"
                                    href={tenant.instagram_profile_url}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    <i className="fa-brands fa-instagram" /> Buka profil Instagram
                                </a>
                            ) : (
                                <p className="rounded-lg bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800 sm:col-span-2">
                                    Akun Instagram penyelenggara belum tersedia pada event ini.
                                </p>
                            )}
                            <button
                                className="rounded-lg border border-[#52704d] px-4 py-3 text-sm font-semibold text-[#40583b] hover:bg-[#f3f6f1] disabled:opacity-60"
                                disabled={form.processing}
                                onClick={() =>
                                    form.post(`/events/${eventId}/tenants/${tenant.id}/registrations`, {
                                        onSuccess: () => setIsOpen(false),
                                    })
                                }
                                type="button"
                            >
                                {form.processing ? 'Menyimpan...' : 'Saya sudah daftar tenant'}
                            </button>
                        </div>
                        {Object.values(form.errors)
                            .filter((error): error is string => typeof error === 'string')
                            .map((error) => (
                                <p className="mt-3 text-sm text-red-700" key={error}>
                                    {error}
                                </p>
                            ))}
                        <p className="mt-4 text-xs leading-5 text-stone-500">
                            Menandai terdaftar hanya menyimpan status di akunmu; penyelenggara tetap perlu mengonfirmasi pendaftaranmu. Voucher di DM
                            juga perlu dikonfirmasi oleh penyelenggara.
                        </p>
                    </section>
                </div>
            )}
        </>
    );
}

type TenantRentalCheckoutProps = {
    eventId: number;
    tenant: NonNullable<EventItem['tenants']>[number];
    vouchers: EventShowProps['tenantVouchers'];
    paymentMethods: EventShowProps['tenantPaymentMethods'];
    bookings: EventShowProps['tenantBookings'];
};

function TenantRentalCheckout({ eventId, tenant, vouchers, paymentMethods, bookings }: TenantRentalCheckoutProps) {
    const form = useForm({ voucher_id: '', payment_method: paymentMethods.find((method) => method.code === 'bca_va')?.code ?? '' });
    const selectedVoucher = vouchers.find((voucher) => String(voucher.id) === form.data.voucher_id);
    const baseAmount = Number(tenant.price ?? 0);
    const discount = selectedVoucher
        ? Math.min(Math.round((baseAmount * selectedVoucher.discount_percentage) / 100), selectedVoucher.max_discount_amount ?? baseAmount)
        : 0;
    const isClosed = tenant.deadline_date ? new Date(tenant.deadline_date).getTime() < Date.now() : false;

    return (
        <div className="mt-4 rounded-lg border border-[#dfe8dc] bg-white p-4">
            <h4 className="text-sm font-bold text-stone-900">Sewa tenant dengan TeKuModal</h4>
            <p className="mt-1 text-xs text-stone-500">Checkout ini menggunakan Midtrans sandbox untuk prototipe booking internal.</p>
            {bookings.map((booking) => (
                <p className="mt-2 text-xs text-stone-600" key={booking.id}>
                    Booking #{booking.id}:{' '}
                    {booking.status === 'paid' ? 'Lunas' : booking.status === 'pending' ? 'Menunggu pembayaran' : 'Tidak berhasil'} ·{' '}
                    {money(booking.amount)}
                </p>
            ))}
            <form
                className="mt-3 space-y-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(`/events/${eventId}/tenants/${tenant.id}/bookings`);
                }}
            >
                {vouchers.length > 0 && (
                    <label className="block text-xs font-medium text-stone-700">
                        Voucher tenant
                        <select
                            className="mt-1 block w-full rounded-md border-stone-300 text-sm"
                            onChange={(event) => form.setData('voucher_id', event.target.value)}
                            value={form.data.voucher_id}
                        >
                            <option value="">Tanpa voucher</option>
                            {vouchers.map((voucher) => (
                                <option key={voucher.id} value={voucher.id}>
                                    {voucher.title}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <label className="block text-xs font-medium text-stone-700">
                    Metode pembayaran
                    <select
                        className="mt-1 block w-full rounded-md border-stone-300 text-sm"
                        onChange={(event) => form.setData('payment_method', event.target.value)}
                        value={form.data.payment_method}
                    >
                        {paymentMethods.map((method) => (
                            <option key={method.code} value={method.code}>
                                {method.label}
                            </option>
                        ))}
                    </select>
                </label>
                {selectedVoucher && (
                    <p className="text-xs text-stone-700">
                        Harga {money(baseAmount)} · Diskon {money(discount)} · Total {money(baseAmount - discount)}
                    </p>
                )}
                {Object.values(form.errors).map((error) => (
                    <p className="text-xs text-red-700" key={error}>
                        {error}
                    </p>
                ))}
                <button
                    className="w-full rounded-full bg-[#5d775a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4d684b] disabled:opacity-60"
                    disabled={form.processing || isClosed || paymentMethods.length === 0}
                    type="submit"
                >
                    {form.processing ? 'Menyiapkan checkout...' : isClosed ? 'Pendaftaran tenant ditutup' : 'Sewa dan bayar'}
                </button>
            </form>
        </div>
    );
}
