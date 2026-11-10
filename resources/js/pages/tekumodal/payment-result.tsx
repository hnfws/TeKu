import { Link, router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

import TeKuModalConstellation from '@/components/tekumodal-constellation';
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
        due_date: string;
    };
    statusCheckError: boolean;
    summary: {
        credit_limit: number;
        available_limit: number;
        period: 'current' | 'next';
        month_label: string;
        xp: number;
        previous_xp: number;
        constellation_xp: number;
        points_balance: number;
        points_earned_now: number;
        paid_installments: number;
        scroll_to_constellation: boolean;
        animate_constellation: boolean;
    };
}

const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function TeKuModalPaymentResult({ payment, statusCheckError, summary }: PaymentResultProps) {
    const constellationRef = useRef<HTMLElement>(null);
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

    useEffect(() => {
        if (!summary.scroll_to_constellation) return;

        const scrollTimer = window.setTimeout(() => {
            constellationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);

        return () => window.clearTimeout(scrollTimer);
    }, [summary.scroll_to_constellation]);

    return (
        <ManagementLayout title={`${label} - TeKuModal`}>
            <div className="mx-auto max-w-[1140px] space-y-5">
                <header className="mb-1">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">TeKuModal</h1>
                </header>
                <section className="overflow-hidden rounded-t-xl bg-[#688264] px-6 pt-6 pb-5 text-white shadow-sm">
                    <div className="text-center">
                        <p className="text-sm font-normal tracking-wide text-white/95">Limit Tersedia</p>
                        <p className="mt-1 mb-1 text-[26px] font-bold tracking-tight md:text-[28px]">{money(summary.available_limit)}</p>
                        <p className="text-[10px] font-normal text-white/80">Total Limit {money(summary.credit_limit)}</p>
                        <Link
                            className="mt-3 rounded-sm bg-white px-4 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                            href="/tekumodal/loans/create"
                        >
                            Ajukan Pinjaman
                        </Link>
                        <p className="mt-3 mb-3 text-[10px] text-white/80">Kamu dapat mengajukan pinjaman modal menggunakan limit yang tersedia</p>
                        <Link
                            className="rounded-sm bg-white px-3 py-1 text-[10px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                            href="/tekumodal?simulator=1"
                        >
                            <i aria-hidden="true" className="fa-solid fa-calculator mr-1.5" />
                            Simulasi Pinjaman
                        </Link>
                    </div>
                    <nav aria-label="Periode tagihan" className="-mx-6 mt-5 -mb-5 grid grid-cols-2 border-t border-[#5b7157] text-xs font-semibold">
                        {(['current', 'next'] as const).map((period) => (
                            <Link
                                aria-current={summary.period === period ? 'page' : undefined}
                                className={`border-r border-[#ded3c5] py-2.5 text-center last:border-r-0 ${summary.period === period ? 'bg-[#eee6dc] font-bold text-slate-900' : 'bg-[#eee6dc]/70 text-slate-700 hover:bg-[#eee6dc]'}`}
                                href={`/tekumodal?period=${period}`}
                                key={period}
                            >
                                {period === 'current' ? 'Tagihan Bulan Ini' : 'Tagihan Bulan Depan'}
                            </Link>
                        ))}
                    </nav>
                </section>
                <section
                    className="rounded-xl border border-neutral-100/60 bg-white px-6 py-12 text-center shadow-sm sm:px-10"
                    data-purpose="current-bill-status"
                >
                    <h2 className="mb-6 text-base font-bold text-neutral-900">
                        {summary.period === 'current' ? 'Tagihan Saat Ini' : 'Tagihan Bulan Depan'}
                    </h2>
                    <div className="mb-4 flex justify-center">
                        {paid ? (
                            <div aria-hidden="true" className="relative flex h-16 w-16 items-center justify-center text-[#688264]">
                                <svg
                                    className="h-14 w-16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    viewBox="0 0 48 56"
                                >
                                    <path d="M6 4h26l10 10v36H6z" />
                                    <path d="M32 4v10h10" />
                                </svg>
                                <span className="absolute right-0 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-white">
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2.5"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="m8 12 3 3 5-5" />
                                    </svg>
                                </span>
                            </div>
                        ) : (
                            <i aria-hidden="true" className="fa-regular fa-clock text-5xl text-amber-600" />
                        )}
                    </div>
                    <p className="text-2xl font-bold tracking-tight text-neutral-900">
                        {paid ? 'Lunas' : payment.status === 'pending' ? 'Menunggu konfirmasi' : 'Belum lunas'}
                    </p>
                    <p className="mt-2 text-xs text-neutral-800">
                        {paid && payment.paid_at
                            ? `Tagihan ${summary.period === 'current' ? 'saat ini' : 'bulan depan'} telah dibayarkan pada ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(payment.paid_at))}`
                            : paid
                              ? `Tagihan ${summary.period === 'current' ? 'saat ini' : 'bulan depan'} telah dibayarkan.`
                              : `Jatuh tempo ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${payment.due_date.slice(0, 10)}T12:00:00`))}`}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                        Cicilan ke-{payment.installment_number} · {money(payment.amount)}
                    </p>
                    {!paid && <p className="mt-3 text-xs text-gray-600">Metode pembayaran: {payment.payment_method}</p>}
                    {payment.status === 'pending' && (
                        <p className="mx-auto mt-4 max-w-xl text-xs text-gray-700">
                            Status pembayaran belum final. Halaman ini tidak menganggap redirect provider sebagai bukti pembayaran.
                        </p>
                    )}
                    {statusCheckError && (
                        <p className="mx-auto mt-3 max-w-xl text-xs text-amber-700">
                            Status dari Midtrans belum dapat diperiksa. Coba muat ulang nanti; pembayaran baru dianggap lunas setelah konfirmasi
                            server terverifikasi.
                        </p>
                    )}
                    {!paid && <p className="mt-5 text-[11px] break-all text-gray-500">Order ID: {payment.order_id}</p>}
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Link
                            className="rounded-md bg-[#688264] px-6 py-2 text-xs font-semibold text-white hover:bg-[#556c52]"
                            href={`/tekumodal?period=${summary.period}`}
                        >
                            Lihat tagihan
                        </Link>
                        {payment.status === 'pending' && (
                            <button
                                className="rounded-md border border-[#688264] px-6 py-2 text-xs font-semibold text-[#52704d] hover:bg-[#F6EFE5]"
                                onClick={retry}
                                type="button"
                            >
                                Lanjutkan checkout
                            </button>
                        )}
                    </div>
                </section>
                <section
                    className="rounded-xl border border-neutral-100/60 bg-white p-5 shadow-sm"
                    data-purpose="monthly-streak"
                    ref={constellationRef}
                >
                    <h3 className="text-sm font-bold text-neutral-900">Streak Bulanan</h3>
                    <p className="mt-1 mb-4 text-[11px] text-neutral-800">
                        Bayar secara teratur setiap bulan tanpa terlambat untuk mendapatkan bonus XP agar kamu bisa semakin cepat mendapatkan voucher!
                    </p>
                    {summary.animate_constellation && (
                        <p className="mb-3 text-xs font-medium text-[#52704d]" role="status">
                            Pembayaran berhasil. Konstelasi akan bergerak sebentar lagi...
                        </p>
                    )}
                    <div className="overflow-hidden rounded">
                        <TeKuModalConstellation
                            animationDelayMs={1000}
                            animateFromXp={summary.animate_constellation ? summary.previous_xp : undefined}
                            xp={summary.constellation_xp}
                        />
                    </div>
                </section>
                <section className="rounded-xl border border-neutral-100/60 bg-white p-5 shadow-sm" data-purpose="reward-progress">
                    <h3 className="text-xs leading-snug font-bold text-neutral-900">
                        Bayar secara rutin dan dapatkan voucher potongan untuk sewa tenant atau diskon bunga untuk tagihan berikutnya!
                    </h3>
                    <p className="mt-1 mb-3 text-[11px] leading-relaxed text-neutral-700">
                        Ayo bayar secara teratur setiap bulan tanpa terlambat, dan dapatkan voucher potongan untuk sewa tenant atau diskon bunga untuk
                        tagihan berikutnya. Kini sewa tenant dan cicilan jadi jauh lebih murah.
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-900">
                            <span>{summary.xp}/100 XP</span>
                            <span className="font-normal text-neutral-700">
                                {summary.points_earned_now > 0
                                    ? `+${summary.points_earned_now} TekuPoint didapat`
                                    : `${summary.points_balance} TekuPoint tersedia`}
                            </span>
                        </div>
                        <div
                            aria-label={`${summary.xp} dari 100 XP`}
                            aria-valuemax={100}
                            aria-valuemin={0}
                            aria-valuenow={summary.xp}
                            className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
                            role="progressbar"
                        >
                            <div className="h-full rounded-full bg-[#698165]" style={{ width: `${summary.xp}%` }} />
                        </div>
                    </div>
                    <Link
                        className="mt-4 inline-flex rounded border border-neutral-800 px-4 py-1.5 text-xs font-medium text-neutral-800 transition hover:bg-neutral-100"
                        href={`/tekumodal?period=${summary.period}`}
                    >
                        Lihat voucher · {summary.points_balance} TekuPoint
                    </Link>
                </section>
                <p className="text-center text-[11px] text-gray-500">Midtrans Sandbox saja · Tidak ada uang sungguhan yang diproses.</p>
            </div>
        </ManagementLayout>
    );
}
