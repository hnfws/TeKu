import { Link, router, useForm, usePage } from '@inertiajs/react';

import ManagementLayout from '@/layouts/management-layout';

type Promotion = {
    id: number;
    code: string;
    discount_type: 'percent' | 'amount';
    discount_value: string | number;
    minimum_purchase: string | number;
    maximum_discount: string | number | null;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
};
type Page<T> = { data: T[]; links: { url: string | null; label: string; active: boolean }[]; from: number | null; to: number | null; total: number };
type PromotionForm = {
    code: string;
    discount_type: 'percent' | 'amount';
    discount_value: number;
    minimum_purchase: number | '';
    maximum_discount: number | '';
    starts_at: string;
    ends_at: string;
};

interface PromotionsProps {
    promotions: Page<Promotion>;
    filters: { search?: string; status?: string };
    metrics: { active: number; expired: number; total: number };
}

const fieldClass = 'h-10 w-full rounded-lg border-0 bg-[#D9D9D9] px-3 text-sm text-neutral-800 placeholder:text-neutral-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#637D60]/30';
const money = (value: string | number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function PromotionsIndex({ promotions, filters, metrics }: PromotionsProps) {
    const emptyForm: PromotionForm = {
        code: '',
        discount_type: 'percent',
        discount_value: 10,
        minimum_purchase: '',
        maximum_discount: '',
        starts_at: '',
        ends_at: '',
    };
    const form = useForm<PromotionForm>(emptyForm);
    const { flash } = usePage<{ flash?: { success?: string } }>().props;
    const errors = form.errors as Record<string, string | undefined>;

    const resetForm = () => {
        form.setData(emptyForm);
        form.clearErrors();
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post('/promotions', { onSuccess: resetForm });
    };

    const applyFilters = (key: string, value: string) => {
        router.get('/promotions', { ...filters, [key]: value || undefined }, { preserveScroll: true, replace: true });
    };

    return (
        <ManagementLayout title="Promo">
            <div className="mx-auto max-w-[1440px] space-y-7">
                <h1 className="mb-1 text-3xl font-bold tracking-tight text-neutral-900">Promo</h1>

                {flash?.success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{flash.success}</div>}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <section aria-label="Ringkasan promo" className="flex flex-col gap-5 lg:col-span-5">
                        <article className="flex h-[155px] flex-col justify-between rounded-2xl bg-white p-6 shadow-sm" data-purpose="active-promo-card">
                            <span className="text-xs font-semibold text-neutral-800">Promo Aktif</span>
                            <p className="text-4xl font-bold tracking-tight text-neutral-900">{metrics.active.toLocaleString('id-ID')}</p>
                        </article>
                        <article className="flex h-[155px] flex-col justify-between rounded-2xl bg-[#C5BCB0] p-6 shadow-sm" data-purpose="expired-promo-card">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-neutral-900">Promo Kadaluarsa/berakhir</span>
                                <i aria-hidden="true" className="fa-solid fa-percent text-lg text-neutral-900" />
                            </div>
                            <p className="text-4xl font-bold tracking-tight text-neutral-900">{metrics.expired.toLocaleString('id-ID')}</p>
                        </article>
                    </section>

                    <form className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm sm:p-7 lg:col-span-7" data-purpose="promo-form-card" onSubmit={submit}>
                        <div>
                            <h2 className="mb-4 text-lg font-bold text-neutral-900">Informasi Promo</h2>
                            <div className="mb-4">
                                <label className="mb-1.5 block text-xs font-medium text-neutral-800" htmlFor="promo-code">Kode Promo</label>
                                <input autoComplete="off" className={fieldClass} id="promo-code" maxLength={80} onChange={(event) => form.setData('code', event.target.value.toUpperCase())} placeholder="Contoh: HEMAT10" required value={form.data.code} />
                                {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-xs font-medium text-neutral-800" htmlFor="discount-type">Jenis Potongan
                                    <select className={`${fieldClass} mt-1.5`} id="discount-type" onChange={(event) => form.setData('discount_type', event.target.value as PromotionForm['discount_type'])} value={form.data.discount_type}>
                                        <option value="percent">Persentase (%)</option>
                                        <option value="amount">Nominal (Rp)</option>
                                    </select>
                                </label>
                                <label className="block text-xs font-medium text-neutral-800" htmlFor="discount-value">{form.data.discount_type === 'percent' ? 'Persentase Potongan' : 'Nominal Potongan'}
                                    <div className="relative mt-1.5">
                                        <input className={`${fieldClass} pr-12`} id="discount-value" max={form.data.discount_type === 'percent' ? 100 : undefined} min="0.01" onChange={(event) => form.setData('discount_value', Number(event.target.value))} required step={form.data.discount_type === 'percent' ? '0.01' : '1'} type="number" value={form.data.discount_value} />
                                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-600">{form.data.discount_type === 'percent' ? '%' : 'Rp'}</span>
                                    </div>
                                    {errors.discount_value && <span className="mt-1 block text-xs text-red-600">{errors.discount_value}</span>}
                                </label>
                                <label className="block text-xs font-medium text-neutral-800" htmlFor="minimum-purchase">Minimum Belanja <span className="font-normal text-neutral-500">(opsional)</span>
                                    <input className={`${fieldClass} mt-1.5`} id="minimum-purchase" min="0" onChange={(event) => form.setData('minimum_purchase', event.target.value === '' ? '' : Number(event.target.value))} placeholder="Rp0" step="1" type="number" value={form.data.minimum_purchase} />
                                    {errors.minimum_purchase && <span className="mt-1 block text-xs text-red-600">{errors.minimum_purchase}</span>}
                                </label>
                                <label className="block text-xs font-medium text-neutral-800" htmlFor="maximum-discount">Maksimum Potongan <span className="font-normal text-neutral-500">(opsional)</span>
                                    <input className={`${fieldClass} mt-1.5`} id="maximum-discount" min="0.01" onChange={(event) => form.setData('maximum_discount', event.target.value === '' ? '' : Number(event.target.value))} placeholder="Tidak dibatasi" step="1" type="number" value={form.data.maximum_discount} />
                                    {errors.maximum_discount && <span className="mt-1 block text-xs text-red-600">{errors.maximum_discount}</span>}
                                </label>
                                <label className="block text-xs font-medium text-neutral-800" htmlFor="starts-at">Mulai Promo <span className="font-normal text-neutral-500">(opsional)</span>
                                    <input className={`${fieldClass} mt-1.5`} id="starts-at" onChange={(event) => form.setData('starts_at', event.target.value)} type="datetime-local" value={form.data.starts_at} />
                                    {errors.starts_at && <span className="mt-1 block text-xs text-red-600">{errors.starts_at}</span>}
                                </label>
                                <label className="block text-xs font-medium text-neutral-800" htmlFor="ends-at">Berakhir Promo <span className="font-normal text-neutral-500">(opsional)</span>
                                    <input className={`${fieldClass} mt-1.5`} id="ends-at" min={form.data.starts_at || undefined} onChange={(event) => form.setData('ends_at', event.target.value)} type="datetime-local" value={form.data.ends_at} />
                                    {errors.ends_at && <span className="mt-1 block text-xs text-red-600">{errors.ends_at}</span>}
                                </label>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                            <button className="w-36 rounded-lg bg-[#63815F] py-2 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50" disabled={form.processing} type="submit">{form.processing ? 'Menyimpan...' : 'Aktifkan'}</button>
                            <button className="w-36 rounded-lg bg-[#CE3E3E] py-2 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90" onClick={resetForm} type="button">Batal</button>
                        </div>
                    </form>
                </div>

                <section className="overflow-hidden rounded-2xl bg-white shadow-sm" data-purpose="promo-table-card">
                    <div className="px-5 pb-4 pt-5 sm:px-6">
                        <div className="mb-4 flex items-baseline gap-2">
                            <h2 className="text-lg font-bold text-neutral-900">Daftar promo</h2>
                            <span className="text-xs font-normal text-neutral-500">Total {metrics.total} promo</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <form action="/promotions" className="flex min-w-[240px] flex-1 gap-2" method="get">
                                {filters.status && <input name="status" type="hidden" value={filters.status} />}
                                <label className="relative min-w-0 flex-1">
                                    <span className="sr-only">Cari kode promo</span>
                                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400" />
                                    <input className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-[#637D60] focus:outline-none focus:ring-1 focus:ring-[#637D60]" defaultValue={filters.search} name="search" placeholder="Cari kode promo..." />
                                </label>
                                <button className="rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50" type="submit">Cari</button>
                            </form>
                            <select aria-label="Filter status promo" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-700" onChange={(event) => applyFilters('status', event.target.value)} value={filters.status ?? ''}>
                                <option value="">Semua status</option>
                                <option value="active">Aktif</option>
                                <option value="scheduled">Terjadwal</option>
                                <option value="expired">Berakhir</option>
                                <option value="inactive">Nonaktif</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px] border-collapse text-left text-xs">
                            <thead className="bg-[#E9E4DC] text-[11px] font-medium text-neutral-600">
                                <tr><th className="px-4 py-3">Kode Promo</th><th className="px-4 py-3">Persentase</th><th className="px-4 py-3">Durasi Promo</th><th className="px-4 py-3 text-right">Aksi</th></tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 text-neutral-700">
                                {promotions.data.map((promotion) => {
                                    const duration = [
                                        promotion.starts_at ? new Date(promotion.starts_at).toLocaleDateString('id-ID') : 'Mulai sekarang',
                                        promotion.ends_at ? new Date(promotion.ends_at).toLocaleDateString('id-ID') : 'Tanpa batas waktu',
                                    ];
                                    return <tr className="transition-colors hover:bg-neutral-50/60" key={promotion.id}>
                                        <td className="px-4 py-3"><span className="font-semibold text-neutral-900">{promotion.code}</span></td>
                                        <td className="px-4 py-3 font-semibold text-neutral-800">{promotion.discount_type === 'percent' ? `${Number(promotion.discount_value)}%` : money(promotion.discount_value)}</td>
                                        <td className="px-4 py-3 text-neutral-600"><span>{duration[0]}</span><span className="mx-1 text-neutral-400">s.d.</span><span>{duration[1]}</span></td>
                                        <td className="px-4 py-3"><div className="flex justify-end gap-2">
                                            <button aria-label={`${promotion.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${promotion.code}`} className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${promotion.is_active ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} onClick={() => router.patch(`/promotions/${promotion.id}/toggle`, {}, { preserveScroll: true })} type="button">{promotion.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                                            <button aria-label={`Hapus ${promotion.code}`} className="rounded-lg border border-red-200 px-3 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50" onClick={() => {
                                                if (window.confirm(`Hapus promo ${promotion.code}? Promo ini tidak dapat digunakan lagi.`)) router.delete(`/promotions/${promotion.id}`, { preserveScroll: true });
                                            }} type="button">Hapus</button>
                                        </div></td>
                                    </tr>;
                                })}
                                {!promotions.data.length && <tr><td className="px-4 py-12 text-center text-sm text-neutral-500" colSpan={4}>Belum ada promo yang sesuai. Buat promo melalui formulir di atas.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-4 text-xs text-neutral-500 sm:px-6">
                        <p>Menampilkan {promotions.from ?? 0}–{promotions.to ?? 0} dari {promotions.total} promo</p>
                        <nav aria-label="Halaman daftar promo" className="flex gap-1">
                            {promotions.links.map((link, index) => link.url ? <Link className={`rounded px-3 py-1.5 ${link.active ? 'bg-[#637D60] font-semibold text-white' : 'text-neutral-600 hover:bg-neutral-100'}`} href={link.url} key={`${link.label}-${index}`} dangerouslySetInnerHTML={{ __html: link.label }} /> : <span aria-disabled="true" className="rounded px-3 py-1.5 text-neutral-300" key={`${link.label}-${index}`} dangerouslySetInnerHTML={{ __html: link.label }} />)}
                        </nav>
                    </div>
                </section>
            </div>
        </ManagementLayout>
    );
}
