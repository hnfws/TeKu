import { Link, router } from '@inertiajs/react';

import ManagementLayout from '@/layouts/management-layout';

type SaleRow = {
    id: number;
    transaction_code: string;
    customer_name: string | null;
    payment_method: 'cash' | 'qris' | 'debit' | null;
    total_amount: string | number;
    sold_at: string;
    items_count: number;
};
type Page<T> = { data: T[]; links: { url: string | null; label: string; active: boolean }[]; from: number | null; to: number | null; total: number };
type BestSeller = { product_name: string; category: string | null; quantity_sold: number; revenue: string | number };

interface SalesIndexProps {
    sales: Page<SaleRow>;
    filters: { search?: string; payment_method?: string };
    metrics: { today: number; month: number; todayCount: number };
    bestSellers: BestSeller[];
}

const money = (value: string | number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const paymentLabels: Record<NonNullable<SaleRow['payment_method']>, string> = { cash: 'Tunai', qris: 'QRIS', debit: 'Debit' };
const paymentLabel = (method: SaleRow['payment_method']) => (method ? paymentLabels[method] : '—');

export default function SalesIndex({ sales, filters, metrics, bestSellers }: SalesIndexProps) {
    const filter = (key: string, value: string) =>
        router.get('/sales', { ...filters, [key]: value || undefined }, { preserveScroll: true, replace: true });

    return (
        <ManagementLayout title="Penjualan">
            <div className="mx-auto max-w-[1440px] space-y-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[32px] leading-none font-bold tracking-tight text-stone-900">Penjualan</h1>
                        <p className="mt-2 text-[13px] text-stone-500">Pantau transaksi dan kelola pembayaran penjualan di setiap event.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Link
                            className="flex items-center gap-2 rounded-lg bg-[#465b43] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[#384a35]"
                            href="/sales/pos"
                        >
                            <i className="fa-solid fa-plus" />
                            Sistem penjualan
                        </Link>
                    </div>
                </header>

                <section aria-label="Ringkasan penjualan" className="grid gap-5 md:grid-cols-3">
                    <article className="flex flex-col justify-between rounded-xl bg-[#d4cdc2] p-5 shadow-sm">
                        <p className="text-[13px] font-medium text-stone-700">Penjualan hari ini</p>
                        <div className="mt-4">
                            <p className="text-2xl font-bold tracking-tight text-stone-900">{money(metrics.today)}</p>
                            <p className="mt-1.5 text-[11px] text-stone-600">Total transaksi yang tercatat hari ini</p>
                        </div>
                    </article>
                    <article className="flex flex-col justify-between rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
                        <p className="text-[13px] font-medium text-stone-600">Penjualan bulan ini</p>
                        <div className="mt-4">
                            <p className="text-2xl font-bold tracking-tight text-stone-900">{money(metrics.month)}</p>
                            <p className="mt-1.5 text-[11px] text-stone-500">
                                {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </article>
                    <article className="flex flex-col justify-between rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
                        <p className="text-[13px] font-medium text-stone-600">Transaksi hari ini</p>
                        <div className="mt-4">
                            <p className="text-2xl font-bold tracking-tight text-stone-900">{metrics.todayCount.toLocaleString('id-ID')}</p>
                            <p className="mt-1.5 text-[11px] text-stone-500">Transaksi tersimpan</p>
                        </div>
                    </article>
                </section>

                <section className="mb-6 rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold tracking-tight text-stone-900">Daftar transaksi</h2>
                            <span className="text-xs font-medium text-stone-400">{sales.total} transaksi</span>
                        </div>
                        <form
                            className="flex w-full flex-wrap gap-2 sm:w-auto"
                            onSubmit={(event) => {
                                event.preventDefault();
                                const data = new FormData(event.currentTarget);
                                router.get('/sales', Object.fromEntries(data.entries()), { preserveScroll: true, replace: true });
                            }}
                        >
                            <label className="relative min-w-[220px] flex-1">
                                <span className="sr-only">Cari nomor transaksi atau pelanggan</span>
                                <i className="fa-solid fa-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-xs text-stone-400" />
                                <input
                                    className="w-full rounded-lg border border-stone-200 py-2 pr-3 pl-9 text-xs placeholder:text-stone-400 focus:border-stone-400 focus:ring-1 focus:ring-stone-400 focus:outline-none"
                                    defaultValue={filters.search}
                                    name="search"
                                    placeholder="Cari nomor transaksi atau pelanggan..."
                                />
                            </label>
                            <select
                                aria-label="Filter metode pembayaran"
                                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700"
                                name="payment_method"
                                onChange={(event) => filter('payment_method', event.target.value)}
                                value={filters.payment_method ?? ''}
                            >
                                <option value="">Semua metode</option>
                                <option value="cash">Tunai</option>
                                <option value="qris">QRIS</option>
                                <option value="debit">Debit</option>
                            </select>
                            <button
                                className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                                type="submit"
                            >
                                Cari
                            </button>
                        </form>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-stone-100 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                                    <th className="px-3 py-3">No. transaksi / Barang</th>
                                    <th className="px-3 py-3">Pelanggan</th>
                                    <th className="px-3 py-3">Tanggal</th>
                                    <th className="px-3 py-3">Metode</th>
                                    <th className="px-3 py-3 text-right">Total</th>
                                    <th className="px-3 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                                {sales.data.map((sale) => (
                                    <tr className="transition-colors hover:bg-stone-50/70" key={sale.id}>
                                        <td className="px-3 py-3">
                                            <p className="font-bold text-stone-900">{sale.transaction_code}</p>
                                            <p className="mt-1 text-[11px] text-stone-400">{sale.items_count} produk</p>
                                        </td>
                                        <td className="px-3 py-3 text-stone-600">{sale.customer_name || 'Pelanggan umum'}</td>
                                        <td className="px-3 py-3 text-stone-600">{new Date(sale.sold_at).toLocaleString('id-ID')}</td>
                                        <td className="px-3 py-3 text-stone-600">{paymentLabel(sale.payment_method)}</td>
                                        <td className="px-3 py-3 text-right font-bold text-stone-900">{money(sale.total_amount)}</td>
                                        <td className="px-3 py-3 text-right">
                                            <Link
                                                className="rounded border border-stone-200 px-3 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100"
                                                href={`/sales/${sale.id}`}
                                            >
                                                Detail
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {!sales.data.length && (
                                    <tr>
                                        <td className="px-3 py-12 text-center text-sm text-stone-500" colSpan={6}>
                                            Belum ada transaksi.{' '}
                                            <Link className="font-semibold text-[#465b43] hover:underline" href="/sales/pos">
                                                Mulai penjualan
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                        <p className="text-xs text-stone-500">
                            Menampilkan {sales.from ?? 0}–{sales.to ?? 0} dari {sales.total} transaksi
                        </p>
                        <nav aria-label="Halaman transaksi" className="flex gap-1">
                            {sales.links.map((link, index) =>
                                link.url ? (
                                    <Link
                                        className={`rounded px-3 py-1.5 text-xs ${link.active ? 'bg-[#4a5f47] font-medium text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                                        href={link.url}
                                        key={`${link.label}-${index}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        aria-disabled="true"
                                        className="rounded px-3 py-1.5 text-xs text-stone-300"
                                        key={`${link.label}-${index}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </nav>
                    </div>
                </section>

                <section className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-base font-bold tracking-tight text-stone-900">Barang terlaris hari ini</h2>
                        <Link className="text-xs font-semibold text-[#465b43] hover:underline" href="/sales/report">
                            Lihat laporan penjualan
                        </Link>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {bestSellers.map((item) => (
                            <article
                                className="flex items-center justify-between gap-3 rounded-xl bg-[#faf7f2] p-4"
                                key={`${item.product_name}-${item.category}`}
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-stone-800">{item.product_name}</p>
                                    <p className="mt-1 text-xs text-stone-500">
                                        {item.category || 'Tanpa kategori'} · {item.quantity_sold} terjual
                                    </p>
                                </div>
                                <p className="shrink-0 text-xs font-bold text-stone-900">{money(item.revenue)}</p>
                            </article>
                        ))}
                        {!bestSellers.length && <p className="text-sm text-stone-500">Belum ada penjualan hari ini.</p>}
                    </div>
                </section>
            </div>
        </ManagementLayout>
    );
}
