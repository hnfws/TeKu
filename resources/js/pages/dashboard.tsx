import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import DashboardCalendar from '@/components/dashboard-calendar';
import ManagementLayout from '@/layouts/management-layout';

type EventItem = {
    id: number;
    title: string;
    start_date: string | null;
    location_name: string | null;
    image_url?: string | null;
    organizer_name?: string | null;
};

type Product = {
    id: number;
    name: string;
    sku: string;
    category: string;
    stock_quantity: number;
    min_stock: number;
    unit: string;
    selling_price: string | number;
};

interface DashboardProps {
    metrics: { dailySales: number; monthlySales: number; stockUnits: number; productCount: number };
    registeredEvents: EventItem[];
    calendarEvents: { id: number; title: string; start_date: string | null }[];
    products: Product[];
}

const money = (value: number | string) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

const eventDate = (value: string | null) =>
    value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Jadwal belum tersedia';

export default function Dashboard({ metrics, registeredEvents, calendarEvents, products }: DashboardProps) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [sortAscending, setSortAscending] = useState(true);
    const categories = [...new Set(products.map((product) => product.category))].sort();
    const visibleProducts = useMemo(() => products
        .filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase()))
        .filter((product) => !category || product.category === category)
        .filter((product) => !status || (status === 'low' ? product.stock_quantity > 0 && product.stock_quantity <= product.min_stock : status === 'out' ? product.stock_quantity === 0 : product.stock_quantity > product.min_stock))
        .sort((left, right) => sortAscending ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name)), [products, search, category, status, sortAscending]);

    return (
        <ManagementLayout title="Dashboard">
            <div className="mx-auto max-w-[1440px] space-y-7">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-[#688463]">Ringkasan usaha</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">Dashboard</h1>
                    </div>
                    <Link className="rounded-lg bg-[#3e5638] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#33472e]" href="/event-dashboard">
                        Lihat Event
                    </Link>
                </header>

                <section aria-label="Ringkasan kinerja" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Total Penjualan Harian', value: money(metrics.dailySales), icon: 'fa-sack-dollar' },
                        { label: 'Total Penjualan Bulanan', value: money(metrics.monthlySales), icon: 'fa-chart-line' },
                        { label: 'Jumlah Stok Saat Ini', value: `${metrics.stockUnits.toLocaleString('id-ID')} unit`, icon: 'fa-boxes-stacked' },
                        { label: 'Jumlah Produk', value: `${metrics.productCount} produk`, icon: 'fa-cube' },
                    ].map((item) => (
                        <article key={item.label} className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-stone-500">{item.label}</span>
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf1e9] text-[#52704d]">
                                    <i className={`fa-solid ${item.icon}`} />
                                </span>
                            </div>
                            <p className="mt-5 text-2xl font-bold text-stone-900">{item.value}</p>
                        </article>
                    ))}
                </section>

                <div className="grid gap-6 xl:grid-cols-12">
                    <section className="space-y-4 xl:col-span-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-stone-900">Event Terdaftar</h2>
                                <p className="text-sm text-stone-500">Event yang sudah Anda daftarkan</p>
                            </div>
                            <Link className="text-sm font-semibold text-[#52704d] hover:underline" href="/event-dashboard">Semua event</Link>
                        </div>
                        {registeredEvents.length ? registeredEvents.map((event) => (
                            <Link key={event.id} className="flex flex-col gap-4 rounded-xl border border-stone-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center" href={`/events/${event.id}`}>
                                <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:w-32">
                                    {event.image_url && <img alt="" className="h-full w-full object-cover" src={event.image_url} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-stone-900">{event.title}</h3>
                                    <p className="mt-2 text-xs text-stone-500"><i className="fa-regular fa-calendar mr-2" />{eventDate(event.start_date)}</p>
                                    <p className="mt-1 text-xs text-stone-500"><i className="fa-solid fa-location-dot mr-2" />{event.location_name || 'Lokasi belum tersedia'}</p>
                                    <p className="mt-2 text-xs text-stone-400">Oleh {event.organizer_name || 'Penyelenggara event'}</p>
                                </div>
                                <span className="rounded-md bg-emerald-600 px-4 py-2 text-center text-xs font-semibold text-white">Terdaftar</span>
                            </Link>
                        )) : (
                            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
                                <p className="font-semibold text-stone-700">Belum ada event terdaftar</p>
                                <Link className="mt-2 inline-block text-sm font-semibold text-[#52704d] hover:underline" href="/events">Jelajahi event</Link>
                            </div>
                        )}
                    </section>

                    <div className="xl:col-span-4">
                        <DashboardCalendar events={calendarEvents} />
                    </div>
                </div>

                <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Daftar barang</h2>
                            </div>
                            <Link className="flex items-center gap-2 rounded-lg bg-[#3f593b] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#344b31]" href="/inventory">
                                Lihat Selengkapnya <i className="fa-solid fa-arrow-right text-xs" />
                            </Link>
                        </div>
                        <div className="mb-6 flex flex-col items-center gap-3 md:flex-row">
                            <label className="relative w-full flex-1">
                                <span className="sr-only">Cari nama atau kode barang</span>
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                                <input className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-xs focus:border-[#688463] focus:outline-none focus:ring-1 focus:ring-[#688463]" onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau kode barang..." value={search} />
                            </label>
                            <div className="flex w-full items-center gap-2 md:w-auto">
                                <select aria-label="Filter kategori" className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 md:w-44" onChange={(event) => setCategory(event.target.value)} value={category}>
                                    <option value="">Semua kategori</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                                <select aria-label="Filter status" className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 md:w-40" onChange={(event) => setStatus(event.target.value)} value={status}>
                                    <option value="">Semua status</option><option value="safe">Aman</option><option value="low">Hampir Habis</option><option value="out">Habis</option>
                                </select>
                                <button aria-label={sortAscending ? 'Urutkan dari Z ke A' : 'Urutkan dari A ke Z'} className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" onClick={() => setSortAscending(!sortAscending)} type="button">
                                    <i className={`fa-solid ${sortAscending ? 'fa-arrow-down-a-z' : 'fa-arrow-up-z-a'} text-sm`} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] border-collapse text-left">
                                <thead>
                                    <tr className="border-y border-gray-200/60 bg-gray-100/70 text-[11px] font-medium text-gray-500"><th className="px-4 py-2.5 font-medium">Nama barang</th><th className="px-4 py-2.5 font-medium">Kategori</th><th className="px-4 py-2.5 font-medium">Stok</th><th className="px-4 py-2.5 font-medium">Harga</th><th className="px-4 py-2.5 font-medium">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {visibleProducts.map((product) => {
                                        const low = product.stock_quantity <= product.min_stock;
                                        const stockStatus = product.stock_quantity === 0 ? 'Habis' : low ? 'Hampir Habis' : 'Aman';
                                        return <tr className="transition-colors hover:bg-gray-50/50" key={product.id}>
                                            <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-gray-600"><i className="fa-solid fa-box" /></span><div><p className="font-bold text-gray-900">{product.name}</p><p className="text-[11px] text-gray-400">{product.sku}</p></div></div></td>
                                            <td className="px-4 py-3 text-gray-500">{product.category}</td>
                                            <td className="px-4 py-3 text-gray-800"><span className="font-bold">{product.stock_quantity}</span> <span className="text-[11px] text-gray-400">{product.unit}</span></td>
                                            <td className="px-4 py-3 text-gray-800">{money(product.selling_price)}</td>
                                            <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${product.stock_quantity === 0 ? 'bg-red-50 text-red-700' : low ? 'bg-amber-50 text-amber-700' : 'bg-[#e8f4ec] text-[#2b7d4d]'}`}><span className={`h-1.5 w-1.5 rounded-full ${product.stock_quantity === 0 ? 'bg-red-700' : low ? 'bg-amber-700' : 'bg-[#2b7d4d]'}`} />{stockStatus}</span></td>
                                        </tr>;
                                    })}
                                    {!visibleProducts.length && <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={5}>{products.length ? 'Tidak ada barang yang sesuai filter.' : 'Belum ada barang di persediaan.'}</td></tr>}
                                </tbody>
                            </table>
                        </div>
                </section>
            </div>
        </ManagementLayout>
    );
}
