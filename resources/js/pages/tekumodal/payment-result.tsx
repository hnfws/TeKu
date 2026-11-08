import { Link, router } from '@inertiajs/react';

import ManagementLayout from '@/layouts/management-layout';

interface PaymentResultProps {
    payment: {
        id: number;
        status: string;
        amount: number;
        order_id: string;
        paid_at: string | null;
        installment_number: number;
        installment_id: number;
        payment_method: string;
    };
    statusCheckError: boolean;
}

const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value));

export default function TeKuModalPaymentResult({ payment, statusCheckError }: PaymentResultProps) {
    const paid = payment.status === 'paid';
    const label = paid
        ? 'Pembayaran Berhasil'
        : payment.status === 'expired'
          ? 'Pembayaran Kedaluwarsa'
          : payment.status === 'cancel'
            ? 'Pembayaran Dibatalkan'
            : payment.status === 'failed'
              ? 'Pembayaran Gagal'
              : 'Pembayaran Menunggu';
    const retry = () => router.post(`/tekumodal/installments/${payment.installment_id}/payments`, { payment_method: payment.payment_method });

    return (
        <ManagementLayout title={`${label} - TeKuModal`}>
            <div className="mx-auto max-w-3xl">
                <Link className="text-sm font-semibold text-[#52704d] hover:underline" href="/tekumodal">
                    <i aria-hidden="true" className="fa-solid fa-arrow-left mr-2" />
                    Kembali ke TeKuModal
                </Link>
                <section className="mx-auto mt-8 max-w-xl overflow-hidden rounded-xl border border-stone-200 bg-white text-center shadow-sm">
                    <div className="bg-[#668063] px-6 py-5 text-white">
                        <h1 className="text-xl font-bold">{label}</h1>
                    </div>
                    <div className="px-6 py-10">
                        <i
                            aria-hidden="true"
                            className={`fa-regular ${paid ? 'fa-circle-check text-[#688265]' : 'fa-clock text-amber-600'} text-6xl`}
                        />
                        <p className="mt-5 text-3xl font-bold text-gray-900">
                            {paid ? 'Lunas' : payment.status === 'pending' ? 'Menunggu konfirmasi' : 'Belum lunas'}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                            Cicilan ke-{payment.installment_number} · {money(payment.amount)}
                        </p>
                        {payment.paid_at && <p className="mt-2 text-xs text-gray-600">Dibayar {date(payment.paid_at)}</p>}
                        {payment.status === 'pending' && (
                            <p className="mt-4 text-sm text-gray-700">
                                Status pembayaran belum final. Halaman ini tidak menganggap redirect provider sebagai bukti pembayaran.
                            </p>
                        )}
                        {statusCheckError && (
                            <p className="mt-3 text-xs text-amber-700">
                                Status dari Midtrans belum dapat diperiksa. Coba muat ulang nanti; pembayaran baru dianggap lunas setelah konfirmasi
                                server terverifikasi.
                            </p>
                        )}
                        <p className="mt-5 text-[11px] break-all text-gray-500">Order ID: {payment.order_id}</p>
                        <div className="mt-7 flex flex-wrap justify-center gap-3">
                            <Link className="rounded-md bg-[#668063] px-6 py-2 text-sm font-semibold text-white hover:bg-[#556c52]" href="/tekumodal">
                                Lihat tagihan
                            </Link>
                            {payment.status === 'pending' && (
                                <button
                                    className="rounded-md border border-[#668063] px-6 py-2 text-sm font-semibold text-[#52704d] hover:bg-[#F6EFE5]"
                                    onClick={retry}
                                    type="button"
                                >
                                    Lanjutkan checkout
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="bg-[#F6EFE6] px-5 py-3 text-xs text-gray-600">Midtrans Sandbox saja · Tidak ada uang sungguhan yang diproses.</p>
                </section>
            </div>
        </ManagementLayout>
    );
}
