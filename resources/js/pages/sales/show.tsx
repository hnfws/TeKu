import { Link, usePage } from '@inertiajs/react';

import ManagementLayout from '@/layouts/management-layout';

type SaleItem = {
    id: number;
    product_name: string;
    sku: string | null;
    category: string | null;
    quantity: number;
    unit_price: string | number;
    line_total: string | number;
    product?: { image_path: string | null; image_url: string | null } | null;
};
type SaleData = {
    id: number;
    transaction_code: string;
    customer_name: string | null;
    payment_method: 'cash' | 'qris' | 'debit' | null;
    promo_code: string | null;
    subtotal: string | number;
    discount_amount: string | number;
    total_amount: string | number;
    notes: string | null;
    sold_at: string;
    items: SaleItem[];
};

interface SaleShowProps {
    sale: SaleData;
}

const money = (value: string | number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const paymentLabels: Record<NonNullable<SaleData['payment_method']>, string> = { cash: 'Tunai', qris: 'QRIS', debit: 'Debit' };
const paymentLabel = (method: SaleData['payment_method']) => (method ? paymentLabels[method] : '—');

export default function SaleShow({ sale }: SaleShowProps) {
    const flash = usePage<{ flash?: { success?: string } }>().props.flash;

    return (
        <ManagementLayout title={`Detail ${sale.transaction_code}`}>
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-[32px] tracking-tight">
                        <span className="font-bold text-black">Penjualan</span>
                        <span className="font-normal text-black">/Detail Transaksi</span>
                    </h1>
                    <div className="flex gap-2">
                        <button
                            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 print:hidden"
                            onClick={() => window.print()}
                            type="button"
                        >
                            <i className="fa-solid fa-print mr-2" />
                            Cetak
                        </button>
                        <Link
                            className="rounded-lg bg-[#465b43] px-4 py-2 text-sm font-semibold text-white hover:bg-[#384a35] print:hidden"
                            href="/sales"
                        >
                            Daftar penjualan
                        </Link>
                    </div>
                </header>
                {flash?.success && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {flash.success}
                    </p>
                )}
                <section
                    className="flex max-w-5xl flex-col space-y-7 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm sm:p-8"
                    data-purpose="transaction-card"
                >
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Rincian Transaksi</h2>
                        <p className="mt-1 text-sm text-stone-500">Transaksi tersimpan dan tercatat pada persediaan.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-12">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">ID Transaksi</p>
                            <p className="text-sm text-gray-700">{sale.transaction_code}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">Nama Pelanggan</p>
                            <p className="text-sm text-gray-700">{sale.customer_name || 'Pelanggan umum'}</p>
                        </div>
                    </div>
                    <div className="space-y-3.5">
                        <p className="text-sm font-medium text-gray-900">Nama Barang</p>
                        {sale.items.map((item) => (
                            <article
                                className="flex items-center justify-between gap-4 rounded-xl border border-[#e8e8e8] p-3.5 transition hover:bg-stone-50/50"
                                key={item.id}
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#d4d4d4] text-white">
                                        {item.product?.image_url ? (
                                            <img alt={item.product_name} className="h-full w-full object-cover" src={item.product.image_url} />
                                        ) : (
                                            <i className="fa-solid fa-box" />
                                        )}
                                    </div>
                                    <div className="min-w-0 space-y-0.5">
                                        <h3 className="truncate text-[15px] leading-snug font-semibold text-gray-900">{item.product_name}</h3>
                                        <p className="text-xs text-[#8e8e93]">{item.sku ? `SKU: ${item.sku}` : item.category || 'Produk'}</p>
                                        <p className="text-xs text-[#8e8e93]">{money(item.unit_price)} / unit</p>
                                    </div>
                                </div>
                                <div className="shrink-0 space-y-1 text-right">
                                    <span className="block text-sm font-bold text-gray-900">x{item.quantity}</span>
                                    <span className="block text-[15px] font-bold text-gray-900">{money(item.line_total)}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                    <div className="pt-2">
                        <p className="mb-2 text-sm font-medium text-gray-900">Tanggal &amp; Waktu Transaksi</p>
                        <p className="text-sm text-gray-700">{new Date(sale.sold_at).toLocaleString('id-ID')}</p>
                    </div>
                    {sale.notes && (
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-900">Catatan Pembeli</p>
                            <p className="text-sm whitespace-pre-line text-gray-700">{sale.notes}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-5 border-t border-stone-100 pt-5 sm:grid-cols-2 sm:gap-x-12">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">Subtotal Produk</p>
                            <p className="text-sm font-bold text-gray-900">{money(sale.subtotal)}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">Voucher</p>
                            <p className="text-sm text-gray-700">
                                {sale.promo_code ? (
                                    <>
                                        {sale.promo_code}
                                        {Number(sale.discount_amount) > 0 && (
                                            <span className="text-[#8e8e93] italic"> · Potongan {money(sale.discount_amount)}</span>
                                        )}
                                    </>
                                ) : (
                                    'Tidak digunakan'
                                )}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">Metode Pembayaran</p>
                            <p className="text-sm text-gray-700">{paymentLabel(sale.payment_method)}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900">Total Harga</p>
                            <p className="text-[15px] font-bold text-gray-900">{money(sale.total_amount)}</p>
                        </div>
                    </div>
                </section>
            </div>
        </ManagementLayout>
    );
}
