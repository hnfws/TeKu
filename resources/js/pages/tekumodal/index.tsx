import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import TeKuModalConstellation from '@/components/tekumodal-constellation';
import ManagementLayout from '@/layouts/management-layout';

type Installment = {
    id: number;
    number: number;
    due_date: string;
    amount: number;
    status: 'pending' | 'paid';
    paid_at: string | null;
    principal: number;
    term_months: number;
    latest_payment: { id: number; status: string; payment_method: string } | null;
};

type Voucher = {
    id: number;
    code: string;
    type: string;
    points_cost: number;
    discount_percentage: number;
    max_discount_amount: number | null;
    interest_rate: number | null;
    status: string;
    claimed_at: string;
};

type Reward = {
    type: string;
    category: 'loan' | 'tenant';
    title: string;
    description: string;
    points_cost: number;
    interest_rate: number | null;
    discount_percentage: number | null;
    max_discount_amount: number | null;
    first_loan_only: boolean;
    can_redeem: boolean;
    owned_voucher_id: number | null;
    has_owned_voucher: boolean;
};

interface TeKuModalProps {
    period: 'current' | 'next';
    monthLabel: string;
    openSimulator: boolean;
    simulator: {
        credit_limit: number;
        minimum_loan: number;
        daily_interest_rate: number;
        interest_days_per_month: number;
        monthly_interest_rate: number;
        terms: number[];
    };
    installments: Installment[];
    loans: {
        id: number;
        principal: number;
        term_months: number;
        monthly_interest_rate: string;
        total_interest: number;
        total_repayment: number;
        status: string;
        created_at: string;
        installments_count: number;
    }[];
    bankAccounts: { id: number; bank_name: string; account_holder: string; masked_number: string }[];
    metrics: {
        credit_limit: number;
        available_limit: number;
        active_principal: number;
        xp: number;
        paid_installments: number;
        points_balance: number;
        points_per_reward: number;
    };
    paymentMethods: { label: string; code: string }[];
    rewards: Reward[];
    vouchers: Voucher[];
    successMessage?: string;
}

const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const date = (value: string) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`));

export default function TeKuModalIndex({
    period,
    monthLabel,
    openSimulator,
    simulator,
    installments,
    loans,
    metrics,
    paymentMethods,
    rewards,
    vouchers,
    successMessage,
}: TeKuModalProps) {
    const [paymentMethod, setPaymentMethod] = useState(
        paymentMethods.find((method) => method.code === 'bca_va')?.code ?? paymentMethods[0]?.code ?? '',
    );
    const [methodModalOpen, setMethodModalOpen] = useState(false);
    const [loanSimulatorOpen, setLoanSimulatorOpen] = useState(openSimulator);
    const [processingInstallment, setProcessingInstallment] = useState<number | null>(null);
    const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
    const [copyError, setCopyError] = useState<string | null>(null);
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const selectedMethod = paymentMethods.find((method) => method.code === paymentMethod);
    const totalDue = installments
        .filter((installment) => installment.status !== 'paid')
        .reduce((total, installment) => total + installment.amount, 0);
    const allPaid = installments.length > 0 && installments.every((installment) => installment.status === 'paid');
    const unpaidInstallments = installments
        .filter((installment) => installment.status !== 'paid')
        .sort((a, b) => a.due_date.localeCompare(b.due_date));
    const firstUnpaidInstallment = unpaidInstallments[0];
    const latestPaidInstallment = [...installments]
        .filter((installment) => installment.paid_at)
        .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))[0];
    const groupedMethods = [
        { title: 'Dompet Digital', methods: paymentMethods.filter((method) => ['gopay', 'ovo', 'dana'].includes(method.code)) },
        { title: 'Pembayaran Instan', methods: paymentMethods.filter((method) => method.code === 'qris') },
        { title: 'Virtual Account', methods: paymentMethods.filter((method) => !['gopay', 'ovo', 'dana', 'qris'].includes(method.code)) },
    ].filter((group) => group.methods.length > 0);

    const payInstallment = (installmentId: number) => {
        setProcessingInstallment(installmentId);
        const installment = installments.find((item) => item.id === installmentId);
        const method = installment?.latest_payment?.status === 'pending' ? installment.latest_payment.payment_method : paymentMethod;
        router.post(
            `/tekumodal/installments/${installmentId}/payments`,
            { payment_method: method },
            {
                onFinish: () => setProcessingInstallment(null),
            },
        );
    };

    const copyVoucher = async (code: string) => {
        setCopyError(null);
        try {
            await navigator.clipboard.writeText(code);
            setCopiedVoucher(code);
            window.setTimeout(() => setCopiedVoucher(null), 2000);
        } catch {
            setCopyError('Kode tidak dapat disalin. Silakan salin secara manual.');
        }
    };

    const redeemReward = (type: string) => router.post('/tekumodal/vouchers', { type });

    useEffect(() => {
        if (!loanSimulatorOpen) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setLoanSimulatorOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [loanSimulatorOpen]);

    return (
        <ManagementLayout title="TeKuModal">
            <div className="mx-auto max-w-[1140px] space-y-5">
                <header className="mb-1">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">TeKuModal</h1>
                </header>
                {successMessage && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {successMessage}
                    </div>
                )}
                {errors.payment_method && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                        {errors.payment_method}
                    </div>
                )}
                {errors.voucher && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                        {errors.voucher}
                    </div>
                )}

                <section
                    className={`mb-6 overflow-hidden border border-black/5 bg-[#698165] text-white shadow-sm ${period === 'current' && loans.length === 0 ? 'rounded-xl' : 'rounded-t-xl'}`}
                    data-purpose="loan-summary"
                >
                    <div className={`px-6 text-center ${period === 'current' && loans.length === 0 ? 'pt-8 pb-7' : 'pt-6 pb-5'}`}>
                        <h2
                            className={`font-semibold tracking-wide text-white ${period === 'current' && loans.length === 0 ? 'mb-1.5 text-base text-white/95' : 'mb-0.5 text-sm'}`}
                        >
                            Limit Tersedia
                        </h2>
                        <p
                            className={`font-bold tracking-tight text-white ${period === 'current' && loans.length === 0 ? 'mb-2 text-3xl lg:text-4xl' : 'mb-1.5 text-[26px] md:text-[28px]'}`}
                        >
                            {money(metrics.available_limit)}
                        </p>
                        <p
                            className={`font-normal text-white/85 ${period === 'current' && loans.length === 0 ? 'mb-5 text-xs' : 'mb-3 text-[10px]'}`}
                        >
                            Total Limit {money(metrics.credit_limit)}
                        </p>
                        <Link
                            className={`inline-block bg-white font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 ${period === 'current' && loans.length === 0 ? 'mb-4 rounded-full px-6 py-2 text-xs' : 'mb-3 rounded-sm px-4 py-1.5 text-[11px]'}`}
                            href="/tekumodal/loans/create"
                        >
                            Ajukan Pinjaman
                        </Link>
                        <p
                            className={`font-normal text-white/80 ${period === 'current' && loans.length === 0 ? 'mb-4 text-[11px]' : 'mb-3 text-[10px]'}`}
                        >
                            Kamu dapat mengajukan pinjaman modal menggunakan limit yang tersedia
                        </p>
                        <button
                            className={`inline-flex items-center gap-1.5 bg-white font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 ${period === 'current' && loans.length === 0 ? 'rounded-full px-4 py-1.5 text-xs' : 'rounded-sm px-3 py-1 text-[10px]'}`}
                            onClick={() => setLoanSimulatorOpen(true)}
                            type="button"
                        >
                            <i aria-hidden="true" className="fa-solid fa-calculator" />
                            Simulasi Pinjaman
                        </button>
                    </div>
                    <nav
                        aria-label="Periode tagihan"
                        className={`grid grid-cols-2 border-t text-xs font-semibold ${period === 'current' && loans.length === 0 ? 'border-[#DDD8CE] bg-[#F7F2EB] text-gray-900' : 'border-[#5b7157]'}`}
                    >
                        {(['current', 'next'] as const).map((value) => (
                            <Link
                                aria-current={period === value ? 'page' : undefined}
                                className={`border-r text-center transition-colors last:border-r-0 ${
                                    period === 'current' && loans.length === 0
                                        ? `border-[#DDD8CE] py-3 ${period === value ? 'bg-[#F7F2EB] font-bold text-gray-900' : 'text-gray-800 hover:bg-amber-50/50'}`
                                        : `border-[#ded3c5] py-2.5 ${period === value ? 'bg-[#eee6dc] font-bold text-slate-900' : 'bg-[#eee6dc]/70 font-medium text-slate-700 hover:bg-[#eee6dc]'}`
                                }`}
                                href={`/tekumodal?period=${value}`}
                                key={value}
                            >
                                {value === 'current' ? 'Tagihan Bulan Ini' : 'Tagihan Bulan Depan'}
                            </Link>
                        ))}
                    </nav>
                </section>

                {period === 'current' && (
                    <section
                        className={`-mt-6 mb-6 rounded-b-xl border border-t-0 border-stone-200/80 bg-white text-center shadow-sm ${
                            loans.length === 0 ? 'p-16' : 'p-8'
                        }`}
                        data-purpose="current-bill-card"
                    >
                        {allPaid ? (
                            <>
                                <h3 className="mb-6 text-base font-bold text-neutral-900">Tagihan Saat Ini</h3>
                                <div className="mb-4 flex justify-center">
                                    <div aria-hidden="true" className="relative inline-flex h-16 w-16 items-center justify-center text-[#688264]">
                                        <svg
                                            className="h-16 w-14"
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
                                        <span className="absolute -right-0.5 -bottom-1 rounded-full bg-white p-0.5">
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
                                </div>
                                <h4 className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">Lunas</h4>
                                <p className="text-xs font-normal text-neutral-800">
                                    Tagihan saat ini telah dibayarkan
                                    {latestPaidInstallment?.paid_at ? ` pada ${date(latestPaidInstallment.paid_at)}` : '.'}
                                </p>
                            </>
                        ) : installments.length === 0 ? (
                            <>
                                <h3 className="mb-2 text-sm font-semibold text-slate-800">Tagihan Saat Ini</h3>
                                <p className="text-[11px] text-gray-800">
                                    {loans.length === 0
                                        ? 'Kamu belum melakukan pinjaman. Ayo mulai lakukan peminjaman dan jalankan bisnis mu!'
                                        : `Tidak ada tagihan untuk ${monthLabel}.`}
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="mb-2 text-sm font-semibold text-slate-800">Tagihan Saat Ini</h3>
                                <p className="mb-2 text-[32px] font-bold tracking-wider text-slate-900 md:text-[34px]">{money(totalDue)}</p>
                                <p className="mb-5 text-[11px] font-normal text-slate-600">
                                    {firstUnpaidInstallment ? `Jatuh tempo ${date(firstUnpaidInstallment.due_date)}` : monthLabel}
                                </p>
                                {firstUnpaidInstallment && (
                                    <div className="mx-auto max-w-[360px]">
                                        <button
                                            className="mb-5 flex w-full items-center justify-between rounded bg-[#d7dadb] px-3 py-1.5 text-left text-[10px] font-medium text-slate-800 shadow-inner transition hover:bg-[#cfd2d4]"
                                            onClick={() => setMethodModalOpen(true)}
                                            type="button"
                                        >
                                            <span>Pilih metode pembayaran</span>
                                            <span className="flex items-center gap-1 font-semibold text-slate-900">
                                                {selectedMethod?.label ?? 'Pilih'}
                                                <i aria-hidden="true" className="fa-solid fa-chevron-right text-[9px]" />
                                            </span>
                                        </button>
                                        <button
                                            className="w-28 rounded bg-[#698165] py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#5a7156] disabled:opacity-60"
                                            disabled={processingInstallment !== null || !paymentMethod}
                                            onClick={() => payInstallment(firstUnpaidInstallment.id)}
                                            type="button"
                                        >
                                            {processingInstallment === firstUnpaidInstallment.id
                                                ? 'Memproses...'
                                                : firstUnpaidInstallment.latest_payment?.status === 'pending'
                                                  ? 'Lanjutkan'
                                                  : 'Bayar'}
                                        </button>
                                    </div>
                                )}
                                {installments.length > 1 && (
                                    <div className="mx-auto mt-7 max-w-3xl space-y-2 border-t border-stone-200 pt-5 text-left">
                                        <h4 className="mb-3 text-xs font-bold text-slate-800">Rincian tagihan</h4>
                                        {installments.map((installment) => (
                                            <article
                                                className="flex flex-wrap items-center justify-between gap-3 rounded border border-stone-200 px-4 py-3"
                                                key={installment.id}
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">Cicilan ke-{installment.number}</p>
                                                    <p className="mt-1 text-[10px] text-slate-600">
                                                        {money(installment.amount)} · Jatuh tempo {date(installment.due_date)}
                                                    </p>
                                                </div>
                                                {installment.status === 'paid' ? (
                                                    <span className="text-[10px] font-semibold text-emerald-700">Lunas</span>
                                                ) : (
                                                    <button
                                                        className="rounded border border-[#698165] px-3 py-1 text-[10px] font-semibold text-[#4f684a] hover:bg-[#f6f3ed] disabled:opacity-60"
                                                        disabled={processingInstallment !== null || !paymentMethod}
                                                        onClick={() => payInstallment(installment.id)}
                                                        type="button"
                                                    >
                                                        {processingInstallment === installment.id
                                                            ? 'Memproses...'
                                                            : installment.latest_payment?.status === 'pending'
                                                              ? 'Lanjutkan'
                                                              : 'Bayar'}
                                                    </button>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                )}
                                <p className="mt-5 text-[10px] text-gray-500">
                                    Pembayaran hanya menggunakan Midtrans Sandbox dan tidak memproses uang sungguhan.
                                </p>
                            </>
                        )}
                    </section>
                )}

                {period === 'next' && (
                    <section
                        className="-mt-6 mb-6 rounded-b-xl border border-t-0 border-stone-200/80 bg-white px-6 py-8 text-center shadow-sm sm:py-10"
                        data-purpose="next-bill-card"
                    >
                        {allPaid ? (
                            <>
                                <h3 className="mb-5 text-base font-bold text-neutral-900">Tagihan Bulan Depan</h3>
                                <div className="mb-4 flex justify-center">
                                    <div aria-hidden="true" className="relative inline-flex h-16 w-16 items-center justify-center text-[#688264]">
                                        <svg
                                            className="h-16 w-14"
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
                                        <span className="absolute -right-0.5 -bottom-1 rounded-full bg-white p-0.5">
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
                                </div>
                                <h4 className="mb-2 text-2xl font-bold tracking-tight text-neutral-900">Lunas</h4>
                                <p className="text-xs font-normal text-neutral-800">Tagihan bulan depan sudah dibayarkan.</p>
                            </>
                        ) : installments.length === 0 ? (
                            <>
                                <h3 className="mb-2 text-base font-semibold text-gray-900">Tagihan Bulan Depan</h3>
                                <p className="mx-auto max-w-xl py-5 text-xs text-gray-800">
                                    {loans.length === 0
                                        ? 'Kamu belum melakukan pinjaman. Ayo mulai lakukan peminjaman dan jalankan bisnis mu!'
                                        : `Tidak ada tagihan untuk ${monthLabel}.`}
                                </p>
                            </>
                        ) : unpaidInstallments.length === 0 ? (
                            <>
                                <h3 className="mb-2 text-base font-semibold text-gray-900">Tagihan Bulan Depan</h3>
                                <p className="mx-auto max-w-xl py-5 text-xs text-gray-800">Tidak ada tagihan tersisa untuk {monthLabel}.</p>
                            </>
                        ) : (
                            <>
                                <h3 className="mb-3 text-base font-semibold text-gray-900">Tagihan Bulan Depan</h3>
                                <p className="mb-2 text-[32px] font-bold tracking-wider text-slate-900 md:text-[34px]">{money(totalDue)}</p>
                                <p className="mb-5 text-[11px] font-normal text-slate-600">
                                    Jatuh tempo {firstUnpaidInstallment ? date(firstUnpaidInstallment.due_date) : monthLabel}
                                </p>
                                <div className="mx-auto max-w-[360px]">
                                    <button
                                        className="mb-5 flex w-full items-center justify-between rounded bg-[#d7dadb] px-3 py-1.5 text-left text-[10px] font-medium text-slate-800 shadow-inner transition hover:bg-[#cfd2d4]"
                                        onClick={() => setMethodModalOpen(true)}
                                        type="button"
                                    >
                                        <span>Pilih metode pembayaran</span>
                                        <span className="flex items-center gap-1 font-semibold text-slate-900">
                                            {selectedMethod?.label ?? 'Pilih'}
                                            <i aria-hidden="true" className="fa-solid fa-chevron-right text-[9px]" />
                                        </span>
                                    </button>
                                    <button
                                        className="w-32 rounded bg-[#698165] py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#5a7156] disabled:opacity-60"
                                        disabled={processingInstallment !== null || !paymentMethod}
                                        onClick={() => payInstallment(firstUnpaidInstallment.id)}
                                        type="button"
                                    >
                                        {processingInstallment === firstUnpaidInstallment.id
                                            ? 'Memproses...'
                                            : firstUnpaidInstallment.latest_payment?.status === 'pending'
                                              ? 'Lanjutkan Bayar'
                                              : 'Bayar Cicilan'}
                                    </button>
                                    <p className="mt-2 text-[10px] text-slate-500">
                                        Tombol ini membayar cicilan ke-{firstUnpaidInstallment.number} sebesar {money(firstUnpaidInstallment.amount)}.
                                    </p>
                                </div>
                                {installments.length > 1 && (
                                    <div className="mx-auto mt-6 max-w-3xl space-y-2 border-t border-stone-200 pt-5 text-left">
                                        {installments.map((installment) => (
                                            <article
                                                className="flex flex-wrap items-center justify-between gap-3 rounded border border-stone-200 px-4 py-3 text-xs"
                                                key={installment.id}
                                            >
                                                <div>
                                                    <p className="font-semibold text-gray-800">Cicilan ke-{installment.number}</p>
                                                    <p className="mt-1 text-gray-600">
                                                        {money(installment.amount)} · Jatuh tempo {date(installment.due_date)}
                                                    </p>
                                                </div>
                                                {installment.status === 'paid' ? (
                                                    <span className="text-[10px] font-semibold text-emerald-700">Lunas</span>
                                                ) : (
                                                    <button
                                                        className="rounded border border-[#698165] px-3 py-1 text-[10px] font-semibold text-[#4f684a] hover:bg-[#f6f3ed] disabled:opacity-60"
                                                        disabled={processingInstallment !== null || !paymentMethod}
                                                        onClick={() => payInstallment(installment.id)}
                                                        type="button"
                                                    >
                                                        {processingInstallment === installment.id
                                                            ? 'Memproses...'
                                                            : installment.latest_payment?.status === 'pending'
                                                              ? 'Lanjutkan'
                                                              : 'Bayar'}
                                                    </button>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                )}
                                <p className="mt-5 text-[10px] text-gray-500">
                                    Tagihan bulan depan dapat dibayar lebih awal. Pembayaran menggunakan Midtrans Sandbox dan tidak memproses uang
                                    sungguhan.
                                </p>
                            </>
                        )}
                    </section>
                )}

                <section className="rounded-xl border border-neutral-100/60 bg-white p-5 shadow-sm" data-purpose="monthly-streak">
                    <h3 className="text-sm font-bold text-neutral-900">Streak Bulanan</h3>
                    <p className="mt-1 mb-4 text-[11px] text-neutral-800">
                        Bayar secara teratur setiap bulan tanpa terlambat untuk mendapatkan bonus XP agar kamu bisa semakin cepat mendapatkan voucher!
                    </p>
                    <div className="overflow-hidden rounded">
                        <TeKuModalConstellation xp={metrics.xp} />
                    </div>
                </section>

                <section className="rounded-xl border border-neutral-100/60 bg-white p-5 shadow-sm" data-purpose="reward-progress">
                    <h3 className="text-xs leading-snug font-bold text-neutral-900">
                        Bayar secara rutin dan dapatkan voucher potongan untuk sewa tenant atau diskon bunga untuk tagihan berikutnya!
                    </h3>
                    <p className="mt-1 mb-3 text-[11px] leading-relaxed text-neutral-700">
                        Ayo bayar secara teratur setiap bulan tanpa terlambat, dan dapatkan voucher potongan untuk sewa tenant atau diskon bunga untuk
                        tagihan berikutnya. Setiap 100 XP dari cicilan tepat waktu memberikan 120 TekuPoint.
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-900">
                            <span>{metrics.xp}/100 XP</span>
                            <span className="font-normal text-neutral-700">+{metrics.points_per_reward} TekuPoint / 100 XP</span>
                        </div>
                        <div
                            aria-label={`${metrics.xp} dari 100 XP`}
                            className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
                            role="progressbar"
                            aria-valuemax={100}
                            aria-valuemin={0}
                            aria-valuenow={metrics.xp}
                        >
                            <div className="h-full rounded-full bg-[#698165]" style={{ width: `${metrics.xp}%` }} />
                        </div>
                    </div>
                    {errors.voucher && (
                        <p className="mt-3 text-xs text-red-600" role="alert">
                            {errors.voucher}
                        </p>
                    )}
                </section>

                <section className="mt-6 mb-8" data-purpose="voucher-rewards-section">
                    <div className="mb-4 flex justify-end">
                        <div className="inline-flex items-center gap-2 rounded-sm border border-[#698165] bg-white px-3 py-1 text-xs font-medium text-neutral-800 shadow-sm">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#698165] text-[10px] font-bold text-[#698165]">
                                T
                            </span>
                            <span>TekuPoint: {metrics.points_balance} Point</span>
                        </div>
                    </div>
                    <div className="space-y-3.5">
                        {rewards.map((reward) => {
                            const ownedVoucher = reward.owned_voucher_id
                                ? vouchers.find((voucher) => voucher.id === reward.owned_voucher_id)
                                : undefined;
                            const priorVoucher = vouchers.find((voucher) => voucher.type === reward.type);
                            const actionClass =
                                'rounded border border-neutral-800 px-5 py-1 text-xs font-normal text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50';

                            return (
                                <article
                                    className="flex min-h-[76px] overflow-hidden rounded-md border border-neutral-200/70 bg-white shadow-sm"
                                    key={reward.type}
                                >
                                    <div className="flex w-24 shrink-0 flex-col items-center justify-center border-r border-dashed border-white/40 bg-[#698165] p-2 text-center text-white">
                                        <i
                                            aria-hidden="true"
                                            className={`mb-1 text-xl ${reward.category === 'tenant' ? 'fa-solid fa-ticket' : 'fa-solid fa-coins'}`}
                                        />
                                        <span className="text-[9.5px] leading-tight font-medium">
                                            {reward.category === 'tenant' ? 'Voucher Tenant' : 'Voucher TeKuModal'}
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 p-3">
                                        <div className="space-y-0.5">
                                            <h4 className="text-xs font-bold text-neutral-900">{reward.title}</h4>
                                            <p className="text-[11px] text-neutral-800">{reward.description}</p>
                                            <p className="text-[10px] text-blue-600">S&amp;K Berlaku</p>
                                            {ownedVoucher && (
                                                <code className="block text-[10px] break-all text-neutral-700">{ownedVoucher.code}</code>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {reward.points_cost > 0 && (
                                                <span className="rounded border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-800">
                                                    {reward.points_cost} TekuPoint
                                                </span>
                                            )}
                                            {ownedVoucher?.status === 'available' && reward.category === 'loan' ? (
                                                <Link className={actionClass} href={`/tekumodal/loans/create?voucher_id=${ownedVoucher.id}`}>
                                                    Pakai
                                                </Link>
                                            ) : ownedVoucher?.status === 'available' ? (
                                                <button className={actionClass} onClick={() => copyVoucher(ownedVoucher.code)} type="button">
                                                    {copiedVoucher === ownedVoucher.code ? 'Tersalin' : 'Salin'}
                                                </button>
                                            ) : priorVoucher?.status === 'expired' ? (
                                                <button className={actionClass} disabled type="button">
                                                    Tidak berlaku
                                                </button>
                                            ) : reward.has_owned_voucher ? (
                                                <button className={actionClass} disabled type="button">
                                                    Sudah dipakai
                                                </button>
                                            ) : (
                                                <button
                                                    className={actionClass}
                                                    disabled={!reward.can_redeem}
                                                    onClick={() => redeemReward(reward.type)}
                                                    type="button"
                                                >
                                                    {reward.first_loan_only ? 'Pakai' : 'Tukar'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    {copyError && (
                        <p className="mt-2 text-xs text-red-600" role="alert">
                            {copyError}
                        </p>
                    )}
                    <p className="mt-3 text-[10px] text-neutral-600">
                        Kode voucher tenant dapat disalin; penggunaan pada transaksi sewa belum terhubung di sistem.
                    </p>
                </section>

                {vouchers.length > 0 && (
                    <section className="mb-8 space-y-3" data-purpose="voucher-wallet">
                        <h3 className="text-sm font-bold text-neutral-900">Voucher Saya</h3>
                        {vouchers.map((voucher) => {
                            const reward = rewards.find((item) => item.type === voucher.type);
                            return (
                                <article
                                    className="flex min-h-[76px] overflow-hidden rounded-md border border-neutral-200/70 bg-white shadow-sm"
                                    key={voucher.id}
                                >
                                    <div className="flex w-24 shrink-0 flex-col items-center justify-center border-r border-dashed border-white/40 bg-[#698165] p-2 text-center text-white">
                                        <i aria-hidden="true" className="fa-solid fa-ticket mb-1 text-xl" />
                                        <span className="text-[9.5px] leading-tight font-medium">
                                            {reward?.category === 'tenant' ? 'Voucher Tenant' : 'Voucher TeKuModal'}
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 p-3">
                                        <div>
                                            <h4 className="text-xs font-bold text-neutral-900">{reward?.title ?? 'Voucher TeKuModal'}</h4>
                                            <code className="mt-1 block text-[11px] break-all text-neutral-800">{voucher.code}</code>
                                            <p className="mt-0.5 text-[10px] text-neutral-700">
                                                {voucher.status === 'available'
                                                    ? 'Tersedia'
                                                    : voucher.status === 'reserved'
                                                      ? 'Sedang dipakai untuk checkout'
                                                      : voucher.status === 'expired'
                                                        ? 'Tidak berlaku'
                                                        : 'Sudah digunakan'}
                                            </p>
                                        </div>
                                        {voucher.status === 'available' && (
                                            <div className="flex gap-2">
                                                {reward?.category === 'loan' ? (
                                                    <Link
                                                        className="rounded border border-neutral-800 px-4 py-1 text-xs text-neutral-800 hover:bg-neutral-100"
                                                        href={`/tekumodal/loans/create?voucher_id=${voucher.id}`}
                                                    >
                                                        Pakai
                                                    </Link>
                                                ) : (
                                                    <button
                                                        className="rounded border border-neutral-800 px-4 py-1 text-xs text-neutral-800 hover:bg-neutral-100"
                                                        onClick={() => copyVoucher(voucher.code)}
                                                        type="button"
                                                    >
                                                        {copiedVoucher === voucher.code ? 'Tersalin' : 'Salin kode'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}

                


            </div>

            {methodModalOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setMethodModalOpen(false)}>
                    <section
                        aria-labelledby="payment-method-title"
                        aria-modal="true"
                        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                    >
                        <header className="flex items-center border-b border-gray-200 px-6 py-5">
                            <button
                                aria-label="Tutup"
                                className="mr-4 font-bold text-gray-700"
                                onClick={() => setMethodModalOpen(false)}
                                type="button"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                            <h2 className="text-base font-bold text-gray-900" id="payment-method-title">
                                Pilih Metode Pembayaran
                            </h2>
                        </header>
                        {groupedMethods.map((group) => (
                            <div className="border-b border-gray-100 py-4" key={group.title}>
                                <h3 className="px-6 pb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">{group.title}</h3>
                                {group.methods.map((method) => (
                                    <button
                                        aria-pressed={paymentMethod === method.code}
                                        className="flex w-full items-center justify-between px-6 py-3 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                                        key={method.code}
                                        onClick={() => {
                                            setPaymentMethod(method.code);
                                            setMethodModalOpen(false);
                                        }}
                                        type="button"
                                    >
                                        <span>{method.label}</span>
                                        <i
                                            aria-hidden="true"
                                            className={`fa-solid ${paymentMethod === method.code ? 'fa-circle-check text-[#688265]' : 'fa-chevron-right text-gray-500'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        ))}
                        <p className="mt-auto bg-[#F6EFE5] p-5 text-xs text-gray-600">
                            Checkout dibatasi ke Midtrans Sandbox. Tidak ada pembayaran uang sungguhan.
                        </p>
                    </section>
                </div>
            )}

            {loanSimulatorOpen && (
                <LoanSimulatorModal
                    availableLimit={metrics.available_limit}
                    creditLimit={simulator.credit_limit}
                    dailyInterestRate={simulator.daily_interest_rate}
                    interestDaysPerMonth={simulator.interest_days_per_month}
                    minimumLoan={simulator.minimum_loan}
                    monthlyInterestRate={simulator.monthly_interest_rate}
                    onClose={() => setLoanSimulatorOpen(false)}
                    terms={simulator.terms}
                />
            )}
        </ManagementLayout>
    );
}

interface LoanSimulatorModalProps {
    availableLimit: number;
    creditLimit: number;
    minimumLoan: number;
    dailyInterestRate: number;
    interestDaysPerMonth: number;
    monthlyInterestRate: number;
    terms: number[];
    onClose: () => void;
}

function LoanSimulatorModal({
    availableLimit,
    creditLimit,
    minimumLoan,
    dailyInterestRate,
    interestDaysPerMonth,
    monthlyInterestRate,
    terms,
    onClose,
}: LoanSimulatorModalProps) {
    const [principalInput, setPrincipalInput] = useState('');
    const [termMonths, setTermMonths] = useState(terms[0] ?? 3);
    const [result, setResult] = useState<{ interest: number; monthlyPayment: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const principal = Number(principalInput);

    const calculate = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!Number.isSafeInteger(principal) || principal < minimumLoan || principal > availableLimit) {
            setError(`Masukkan jumlah pinjaman antara ${money(minimumLoan)} dan ${money(availableLimit)}.`);
            setResult(null);
            return;
        }

        const interest = Math.round((principal * monthlyInterestRate * termMonths) / 100);
        const totalRepayment = principal + interest;
        setError(null);
        setResult({
            interest,
            monthlyPayment: Math.round(totalRepayment / termMonths),
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" onClick={onClose}>
            <section
                aria-labelledby="loan-simulator-title"
                aria-modal="true"
                className="relative my-auto w-full max-w-[440px] bg-[#F7F2EB] px-6 py-6 text-gray-900 shadow-2xl sm:px-7 sm:py-7"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
            >
                <header className="flex items-center justify-between pb-6">
                    <h2 className="text-[19px] font-bold tracking-tight text-black sm:text-[20px]" id="loan-simulator-title">
                        Simulasi Pinjaman
                    </h2>
                    <button
                        aria-label="Tutup simulasi pinjaman"
                        className="rounded p-1 text-lg leading-none font-semibold text-black transition-opacity hover:opacity-70 focus:ring-2 focus:ring-[#698365] focus:outline-none"
                        onClick={onClose}
                        type="button"
                    >
                        <span aria-hidden="true" className="font-sans text-[19px] font-bold">
                            ✕
                        </span>
                    </button>
                </header>

                <section aria-label="Informasi simulasi TeKuModal" className="mb-5">
                    <div className="overflow-hidden rounded-[14px] border border-[#7d827a] bg-[#FAF6F0] text-[13px] sm:text-[13.5px]">
                        <div className="grid grid-cols-2 bg-[#698365] text-white">
                            <div className="border-r border-[#81997d] px-3 py-2.5" />
                            <div className="px-3 py-2.5 text-center font-semibold">TeKuModal</div>
                        </div>
                        {[
                            ['Jumlah Pinjaman', `Dana tunai hingga Rp${new Intl.NumberFormat('id-ID').format(creditLimit)}`],
                            ['Bunga Pinjaman Harian', `Mulai dari ${dailyInterestRate}% per hari`],
                            ['Tenor Pinjaman', `${terms.join(', ')} bulan`],
                        ].map(([label, value], index) => (
                            <div className={`grid grid-cols-2 ${index < 2 ? 'border-b border-[#949990]' : ''}`} key={label}>
                                <div className="flex items-center justify-center border-r border-[#949990] px-4 py-2.5 text-center">{label}</div>
                                <div className="flex items-center justify-center px-3 py-2.5 text-center">{value}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <form className="space-y-4" onSubmit={calculate}>
                    <div className="space-y-1.5">
                        <label className="block text-[13.5px] font-medium" htmlFor="simulator-principal">
                            Jumlah Pinjaman
                        </label>
                        <input
                            autoFocus
                            className="h-9 w-full rounded-none border-0 bg-[#D5D8DC] px-3 text-sm text-gray-800 transition focus:ring-2 focus:ring-[#698365]"
                            id="simulator-principal"
                            max={availableLimit}
                            min={minimumLoan}
                            onChange={(event) => {
                                setPrincipalInput(event.target.value);
                                setResult(null);
                                setError(null);
                            }}
                            placeholder={`Min. ${money(minimumLoan)}`}
                            required
                            step="1"
                            type="number"
                            value={principalInput}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                        <label className="space-y-1.5 text-[13.5px] font-medium" htmlFor="simulator-term">
                            <span className="block truncate">Tenor Pinjaman</span>
                            <select
                                className="h-9 w-full rounded-none border-0 bg-[#D5D8DC] px-3 text-sm text-gray-800 transition focus:ring-2 focus:ring-[#698365]"
                                id="simulator-term"
                                onChange={(event) => {
                                    setTermMonths(Number(event.target.value));
                                    setResult(null);
                                }}
                                value={termMonths}
                            >
                                {terms.map((term) => (
                                    <option key={term} value={term}>
                                        {term} bulan
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="space-y-1.5">
                            <span className="block truncate text-[13.5px] font-medium">Bunga Pinjaman</span>
                            <div
                                className="flex h-9 items-center justify-center bg-[#D5D8DC] px-2 text-center text-[11px] leading-tight text-gray-800"
                                aria-live="polite"
                            >
                                {result
                                    ? `${money(result.interest)} total · ${dailyInterestRate}%/hari`
                                    : `${dailyInterestRate}% × ${interestDaysPerMonth} hari`}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[13.5px] font-medium" htmlFor="simulator-monthly-payment">
                            Biaya Per Bulan
                        </label>
                        <output
                            className="flex h-9 w-full items-center bg-[#D5D8DC] px-3 text-sm text-gray-800"
                            id="simulator-monthly-payment"
                            aria-live="polite"
                        >
                            {result ? `${money(result.monthlyPayment)} / bulan` : 'Hitung simulasi untuk melihat cicilan'}
                        </output>
                    </div>
                    {error && (
                        <p className="text-xs text-red-700" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="flex justify-center gap-3 pt-5 pb-1">
                        <button
                            className="rounded-[6px] bg-[#698365] px-6 py-2 text-[13.5px] font-medium tracking-wide text-white shadow-sm transition duration-150 ease-in-out hover:bg-[#5b7357] active:bg-[#4f644b]"
                            type="submit"
                        >
                            Hitung Simulasi
                        </button>
                        {result && (
                            <Link
                                className="rounded-[6px] border border-[#698365] px-4 py-2 text-center text-[13px] font-medium text-[#526c4e] transition hover:bg-white"
                                href={`/tekumodal/loans/create?principal=${principal}&term_months=${termMonths}`}
                            >
                                Ajukan
                            </Link>
                        )}
                    </div>
                </form>
            </section>
        </div>
    );
}
