import { Link, router } from '@inertiajs/react';

import ManagementLayout from '@/layouts/management-layout';

type ProductReport = { product_name: string; category: string | null; quantity_sold: number; revenue: string | number };
type Page<T> = { data: T[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
type MonthPoint = { month: string; label: string; series: { name: string; revenue: number }[] };

interface SalesReportProps {
    month: string;
    chart: MonthPoint[];
    bestSellers: Page<ProductReport>;
    metrics: { totalRevenue: number; transactionCount: number };
    filters: { search?: string };
}

const money = (value: string | number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

function RevenueChart({ points }: { points: MonthPoint[] }) {
    const colors = ['#6366F1', '#4DD4AC', '#F87171'];
    const max = Math.max(...points.flatMap((point) => point.series.map((series) => series.revenue)), 1);
    const locations = points.map((point, index) => ({
        ...point,
        x: points.length <= 1 ? 50 : 50 + index * (910 / (points.length - 1)),
    }));

    return (
        <svg aria-label="Grafik pendapatan enam bulan terakhir" className="h-full w-full overflow-visible" preserveAspectRatio="none" role="img" viewBox="0 0 1000 320">
            <defs>{colors.map((color, index) => <linearGradient id={`sales-area-${index}`} key={color} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient>)}</defs>
            {[20, 70, 120, 170, 220, 270].map((y) => <line className={y === 270 ? 'stroke-stone-300' : 'stroke-stone-100 [stroke-dasharray:3_3]'} key={y} x1="50" x2="960" y1={y} y2={y} />)}
            {[100, 80, 60, 40, 20, 0].map((value, index) => <text className="fill-gray-500 text-[10px]" key={value} textAnchor="end" x="40" y={24 + index * 50}>{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(max * value / 100)}</text>)}
            {points[0]?.series.map((series, seriesIndex) => {
                const color = colors[seriesIndex];
                const linePoints = locations.map((point) => ({
                    x: point.x,
                    y: 270 - ((point.series[seriesIndex]?.revenue ?? 0) / max) * 250,
                    month: point.month,
                    revenue: point.series[seriesIndex]?.revenue ?? 0,
                }));
                const line = linePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
                const area = `${line} L 960 270 L 50 270 Z`;
                return <g key={series.name}><path d={area} fill={`url(#sales-area-${seriesIndex})`} /><path d={line} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />{linePoints.map((point) => <circle cx={point.x} cy={point.y} fill="white" key={point.month} r="3.5" stroke={color} strokeWidth="2"><title>{series.name}: {money(point.revenue)}</title></circle>)}</g>;
            })}
            {locations.map((point) => <text className="fill-gray-600 text-[11px] font-medium" key={`${point.month}-label`} textAnchor="middle" x={point.x} y="292">{point.label}</text>)}
        </svg>
    );
}

export default function SalesReport({ month, chart, bestSellers, metrics, filters }: SalesReportProps) {
    const changeMonth = (nextMonth: string) => router.get('/sales/report', { month: nextMonth, search: filters.search }, { preserveScroll: true, replace: true });

    return (
        <ManagementLayout title="Laporan Penjualan">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Penjualan <span className="text-xl font-bold text-gray-800">/Laporan Penjualan</span></h1>
                    <Link className="text-sm font-semibold text-[#52704d] hover:underline" href="/sales">Kembali ke transaksi</Link>
                </header>
                <section className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm sm:p-6" data-purpose="chart-container">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div><h2 className="text-lg font-bold text-gray-900">Pendapatan</h2><p className="mt-1 text-sm text-gray-500">Pendapatan enam bulan terakhir berdasarkan transaksi tersimpan</p></div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-600">Bulan laporan<input aria-label="Pilih bulan laporan" className="rounded-lg border border-gray-200 px-3 py-2 text-xs" onChange={(event) => changeMonth(event.target.value)} type="month" value={month} /></label>
                    </div>
                    <div className="h-[280px] w-full sm:h-[320px]"><RevenueChart points={chart} /></div>
                    <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-t border-gray-100 pt-4 text-xs font-medium text-gray-700">
                        {(chart[0]?.series ?? []).map((series, index) => <div className="flex items-center gap-2" key={series.name}><span className="inline-flex items-center"><span className="h-0.5 w-3" style={{ backgroundColor: ['#6366F1', '#4DD4AC', '#F87171'][index] }} /><span className="relative -mx-1 inline-block h-2 w-2 rounded-full border-2 border-white" style={{ backgroundColor: ['#6366F1', '#4DD4AC', '#F87171'][index], boxShadow: `0 0 0 1px ${['#6366F1', '#4DD4AC', '#F87171'][index]}` }} /><span className="h-0.5 w-3" style={{ backgroundColor: ['#6366F1', '#4DD4AC', '#F87171'][index] }} /></span><span>{series.name}</span></div>)}
                        {!chart[0]?.series.length && <span className="text-gray-400">Belum ada data pendapatan.</span>}
                    </div>
                    <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2">
                        <article className="rounded-xl bg-[#faf7f2] p-4"><p className="text-xs font-medium text-gray-500">Pendapatan bulan terpilih</p><p className="mt-2 text-xl font-bold text-gray-900">{money(metrics.totalRevenue)}</p></article>
                        <article className="rounded-xl bg-[#faf7f2] p-4"><p className="text-xs font-medium text-gray-500">Jumlah transaksi</p><p className="mt-2 text-xl font-bold text-gray-900">{metrics.transactionCount.toLocaleString('id-ID')}</p></article>
                    </div>
                </section>

                <section className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm sm:p-6" data-purpose="top-products-table">
                    <div className="mb-5 space-y-4">
                        <div className="flex items-center gap-2"><h2 className="text-lg font-bold tracking-tight text-gray-900">Daftar produk terlaris</h2><span className="text-xs font-medium text-gray-400">{bestSellers.total} produk</span></div>
                        <form action="/sales/report" className="flex flex-col gap-3 sm:flex-row sm:items-center" method="get">
                            <input name="month" type="hidden" value={month} />
                            <label className="relative min-w-0 flex-1"><span className="sr-only">Cari produk</span><i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400" /><input className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-xs text-gray-700 placeholder:text-gray-400 focus:border-[#688463] focus:outline-none focus:ring-1 focus:ring-[#688463]" defaultValue={filters.search} name="search" placeholder="Cari nama produk..." /></label>
                            <button className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50" type="submit">Cari</button>
                        </form>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                            <thead><tr className="border-y border-stone-200 bg-[#F2EFE9] font-semibold tracking-wide text-gray-600"><th className="px-4 py-3">Produk</th><th className="px-4 py-3 text-center">Kategori</th><th className="px-4 py-3 text-center">Total Produk</th><th className="px-4 py-3 text-right">Total Pendapatan / Produk</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                                {bestSellers.data.map((product) => <tr className="transition-colors hover:bg-[#faf7f2]/60" key={`${product.product_name}-${product.category}`}><td className="px-4 py-3.5 font-bold text-gray-900">{product.product_name}</td><td className="px-4 py-3.5 text-center text-gray-600">{product.category || 'Tanpa kategori'}</td><td className="px-4 py-3.5 text-center text-gray-600">{Number(product.quantity_sold).toLocaleString('id-ID')} unit</td><td className="px-4 py-3.5 text-right font-bold text-gray-900">{money(product.revenue)}</td></tr>)}
                                {!bestSellers.data.length && <tr><td className="px-4 py-12 text-center text-sm text-gray-500" colSpan={4}>Belum ada penjualan produk untuk bulan ini.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <nav aria-label="Halaman produk terlaris" className="mt-4 flex justify-end gap-1">{bestSellers.links.map((link, index) => link.url ? <Link className={`rounded px-3 py-1.5 text-xs ${link.active ? 'bg-[#688463] font-bold text-white' : 'text-gray-700 hover:bg-gray-100'}`} href={link.url} key={`${link.label}-${index}`} dangerouslySetInnerHTML={{ __html: link.label }} /> : null)}</nav>
                </section>
            </div>
        </ManagementLayout>
    );
}
