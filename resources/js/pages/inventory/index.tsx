import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import InventoryDialog from '@/components/inventory-dialog';
import ManagementLayout from '@/layouts/management-layout';

type Product = {
    id: number;
    name: string;
    sku: string;
    category: string;
    stock_quantity: number;
    min_stock: number;
    unit: string;
    cost_price: number | string;
    selling_price: number | string;
    image_path?: string | null;
};

type Pagination<T> = { data: T[]; links: { url: string | null; label: string; active: boolean }[]; from: number | null; to: number | null; total: number };
type Activity = { id: number; type: string; quantity: number; created_at: string; product?: { name: string } | null; note?: string | null };

interface InventoryProps {
    products: Pagination<Product>;
    filters: { search?: string; category?: string; status?: string; sort?: string };
    categories: string[];
    stats: { units: number; products: number; value: number; low: number; out: number };
    activities: Activity[];
}

const money = (value: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function InventoryIndex({ products, filters, categories, stats, activities }: InventoryProps) {
    const [dialog, setDialog] = useState<{ mode: 'stock' | 'delete'; product: Product } | null>(null);
    const flash = usePage<{ flash?: { success?: string } }>().props.flash;
    const updateFilter = (key: string, value: string) => router.get('/inventory', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true, replace: true });

    return (
        <ManagementLayout title="Persediaan">
            <div className="mx-auto max-w-[1440px] space-y-6">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Persediaan</h1>
                        <p className="mt-1 text-sm text-stone-500">Pantau stok barang dan kelola kebutuhan penjualan di setiap event.</p>
                    </div>
                    <Link className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3e5638] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#33472e]" href="/inventory/create"><i className="fa-solid fa-plus" />Tambah Barang</Link>
                </header>

                {flash?.success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{flash.success}</div>}

                <section aria-label="Ringkasan persediaan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Total Barang', stats.products, 'fa-cube'],
                        ['Jumlah Stok Saat Ini', `${stats.units.toLocaleString('id-ID')} unit`, 'fa-boxes-stacked'],
                        ['Nilai Persediaan', money(stats.value), 'fa-sack-dollar'],
                        ['Perlu Restok', stats.low + stats.out, 'fa-triangle-exclamation'],
                    ].map(([label, value, icon]) => (
                        <article key={label} className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between"><p className="text-sm font-medium text-stone-500">{label}</p><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf1e9] text-[#52704d]"><i className={`fa-solid ${icon}`} /></span></div>
                            <p className="mt-4 text-2xl font-bold text-stone-900">{value}</p>
                        </article>
                    ))}
                </section>

                <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="space-y-4 border-b border-stone-100 p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><h2 className="text-lg font-bold text-stone-900">Daftar Barang</h2><p className="mt-1 text-xs text-stone-500">{products.total} barang terdaftar</p></div>
                            <form action="/inventory" className="flex w-full max-w-md gap-2" method="get">
                                {filters.category && <input name="category" type="hidden" value={filters.category} />}
                                {filters.status && <input name="status" type="hidden" value={filters.status} />}
                                {filters.sort && <input name="sort" type="hidden" value={filters.sort} />}
                                <label className="relative min-w-0 flex-1">
                                    <span className="sr-only">Cari barang</span><i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400" />
                                    <input className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-sm focus:border-[#688463] focus:outline-none focus:ring-2 focus:ring-[#688463]/20" defaultValue={filters.search} name="search" placeholder="Cari nama atau SKU..." />
                                </label>
                                <button className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50" type="submit">Cari</button>
                            </form>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                ['Semua', ''],
                                ['Stok Menipis', 'low'],
                                ['Habis', 'out'],
                            ].map(([label, status]) => (
                                <button key={label} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${filters.status === status || (!filters.status && !status) ? 'bg-[#688463] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`} onClick={() => updateFilter('status', status)} type="button">{label}</button>
                            ))}
                            <select aria-label="Filter kategori" className="ml-auto rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700" onChange={(event) => updateFilter('category', event.target.value)} value={filters.category || ''}>
                                <option value="">Semua kategori</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                            <select aria-label="Urutkan barang" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700" onChange={(event) => updateFilter('sort', event.target.value)} value={filters.sort || 'newest'}>
                                <option value="newest">Terbaru</option><option value="oldest">Terlama</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                            <thead className="bg-[#faf9f6] text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-3">Barang</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Harga Jual</th><th className="px-5 py-3">Stok</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-stone-100">
                                {products.data.map((product) => {
                                    const status = product.stock_quantity === 0 ? 'Habis' : product.stock_quantity <= product.min_stock ? 'Stok menipis' : 'Tersedia';
                                    const badge = status === 'Habis' ? 'bg-red-50 text-red-700' : status === 'Stok menipis' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';
                                    return <tr className="hover:bg-stone-50/70" key={product.id}>
                                        <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-stone-400">{product.image_path ? <img alt="" className="h-full w-full object-cover" src={`/storage/${product.image_path}`} /> : <i className="fa-solid fa-box" />}</div><div><p className="font-semibold text-stone-800">{product.name}</p><p className="mt-0.5 text-xs text-stone-400">{product.sku}</p></div></div></td>
                                        <td className="px-5 py-3 text-stone-600">{product.category}</td>
                                        <td className="px-5 py-3 font-medium text-stone-800">{money(product.selling_price)}</td>
                                        <td className="px-5 py-3"><span className="font-semibold">{product.stock_quantity}</span> <span className="text-xs text-stone-500">{product.unit}</span><p className="mt-0.5 text-[11px] text-stone-400">Min. {product.min_stock}</p></td>
                                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{status}</span></td>
                                        <td className="px-5 py-3"><div className="flex justify-end gap-1"><button aria-label={`Atur stok ${product.name}`} className="rounded-md px-2.5 py-2 text-xs font-semibold text-[#52704d] hover:bg-[#edf1e9]" onClick={() => setDialog({ mode: 'stock', product })} type="button"><i className="fa-solid fa-arrows-rotate" /> <span className="hidden lg:inline">Stok</span></button><Link aria-label={`Edit ${product.name}`} className="rounded-md px-2.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100" href={`/inventory/${product.id}/edit`}><i className="fa-solid fa-pen" /></Link><button aria-label={`Hapus ${product.name}`} className="rounded-md px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => setDialog({ mode: 'delete', product })} type="button"><i className="fa-regular fa-trash-can" /></button></div></td>
                                    </tr>;
                                })}
                                {!products.data.length && <tr><td className="px-5 py-12 text-center" colSpan={6}><i className="fa-solid fa-box-open text-3xl text-stone-300" /><p className="mt-3 font-semibold text-stone-700">Barang tidak ditemukan</p><p className="mt-1 text-sm text-stone-500">Coba ubah filter atau tambahkan barang baru.</p><Link className="mt-3 inline-block text-sm font-semibold text-[#52704d] hover:underline" href="/inventory/create">Tambah Barang</Link></td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-5 py-4">
                        <p className="text-xs text-stone-500">Menampilkan {products.from ?? 0}–{products.to ?? 0} dari {products.total} barang</p>
                        <nav aria-label="Halaman daftar barang" className="flex gap-1">
                            {products.links.map((link, index) => link.url ? <Link key={`${link.label}-${index}`} className={`rounded-md px-3 py-1.5 text-xs ${link.active ? 'bg-[#688463] font-semibold text-white' : 'text-stone-600 hover:bg-stone-100'}`} href={link.url} preserveScroll dangerouslySetInnerHTML={{ __html: link.label }} /> : <span aria-disabled="true" className="rounded-md px-3 py-1.5 text-xs text-stone-300" key={`${link.label}-${index}`} dangerouslySetInnerHTML={{ __html: link.label }} />)}
                        </nav>
                    </div>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="font-bold text-stone-900">Aktivitas Persediaan</h2>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {activities.map((activity) => <article className="flex items-start gap-3 rounded-lg bg-[#faf9f6] p-3" key={activity.id}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activity.type === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><i className={`fa-solid ${activity.type === 'in' ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs`} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-800">{activity.product?.name || 'Produk dihapus'}</p><p className="mt-1 text-xs text-stone-500">{activity.type} {activity.quantity} unit{activity.note ? ` · ${activity.note}` : ''}</p><time className="mt-1 block text-[11px] text-stone-400">{new Date(activity.created_at).toLocaleString('id-ID')}</time></div></article>)}
                        {!activities.length && <p className="text-sm text-stone-500">Belum ada aktivitas.</p>}
                    </div>
                </section>
            </div>
            {dialog && <InventoryDialog key={`${dialog.mode}-${dialog.product.id}`} mode={dialog.mode} onClose={() => setDialog(null)} product={dialog.product} />}
        </ManagementLayout>
    );
}
