import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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
    discount_percentage: number;
    status: string;
    claimed_at: string;
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
        can_claim_voucher: boolean;
        streak: boolean[];
    };
    paymentMethods: { label: string; code: string }[];
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
    bankAccounts,
    metrics,
    paymentMethods,
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

    const claimVoucher = () => router.post('/tekumodal/vouchers');

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
            <div className="mx-auto max-w-[1180px] space-y-6">
                <header className="mb-1">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">TeKuModal</h1>
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

                <section className="overflow-hidden rounded-2xl border border-neutral-200/50 shadow-sm" data-purpose="loan-banner">
                    <div className="flex flex-col items-center bg-[#678263] px-6 py-8 text-center text-white">
                        <h2 className="mb-1 text-base font-semibold tracking-wide text-white/95">Limit Tersedia</h2>
                        <p className="mb-2 text-3xl font-bold tracking-tight sm:text-[34px]">{money(metrics.available_limit)}</p>
                        <p className="mb-5 text-xs text-white/80">Total Limit {money(metrics.credit_limit)}</p>
                        <Link
                            className="mb-4 rounded-md bg-[#FBF6EE] px-6 py-2 text-xs font-semibold text-gray-900 shadow-sm transition hover:bg-white"
                            href="/tekumodal/loans/create"
                        >
                            Ajukan Pinjaman
                        </Link>
                        <p className="mb-4 text-[11px] text-white/90">Fitur ini hanya simulasi, tidak ada pencairan dana.</p>
                        <button
                            className="rounded-md bg-[#FBF6EE] px-4 py-2 text-xs font-semibold text-gray-900 shadow-sm transition hover:bg-white"
                            onClick={() => setLoanSimulatorOpen(true)}
                            type="button"
                        >
                            <i aria-hidden="true" className="fa-solid fa-calculator mr-2" />
                            Simulasi Pinjaman
                        </button>
                    </div>
                </section>

                <section className="overflow-hidden rounded-b-2xl border border-gray-100 bg-white shadow-sm" data-purpose="billing-tabs-container">
                    <div
                        aria-label="Periode tagihan"
                        className="grid grid-cols-2 border-b border-gray-300 bg-[#EFE7DA]/70 text-sm font-bold text-gray-800"
                    >
                        {(['current', 'next'] as const).map((value) => (
                            <Link
                                aria-current={period === value ? 'page' : undefined}
                                className={`border-r border-gray-300 px-4 py-3 text-center transition-colors last:border-r-0 ${period === value ? 'bg-[#F5EFE6]' : 'text-gray-600 hover:bg-[#F2ECE0]'}`}
                                href={`/tekumodal?period=${value}`}
                                key={value}
                            >
                                {value === 'current' ? 'Tagihan Bulan Ini' : 'Tagihan Bulan Depan'}
                            </Link>
                        ))}
                    </div>
                    <div className="p-6 text-center sm:p-10">
                        <h3 className="mb-2 text-xl font-bold text-gray-900">Tagihan {monthLabel}</h3>
                        {allPaid ? (
                            <div className="flex min-h-64 flex-col items-center justify-center">
                                <i aria-hidden="true" className="fa-regular fa-circle-check mb-4 text-5xl text-[#688265]" />
                                <p className="text-3xl font-bold tracking-tight text-neutral-900">Lunas</p>
                                <p className="mt-2 text-sm text-gray-700">Semua tagihan periode ini telah dibayarkan.</p>
                            </div>
                        ) : installments.length === 0 ? (
                            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
                                <p className="max-w-xl text-xs tracking-tight text-gray-700">
                                    {loans.length === 0
                                        ? 'Kamu belum melakukan pinjaman. Ayo mulai lakukan peminjaman dan jalankan bisnis mu!'
                                        : 'Tidak ada tagihan untuk periode ini.'}
                                </p>
                            </div>
                        ) : (
                            <div className="mx-auto max-w-3xl space-y-4 text-left">
                                <div className="mb-5 text-center">
                                    <p className="text-xs font-semibold text-gray-600">Total belum dibayar</p>
                                    <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950">{money(totalDue)}</p>
                                </div>
                                {installments.map((installment) => (
                                    <article className="rounded-xl border border-stone-200 bg-[#FAF5ED] p-5" key={installment.id}>
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h4 className="font-bold text-gray-900">Cicilan ke-{installment.number}</h4>
                                                <p className="mt-1 text-xs text-gray-600">
                                                    Pinjaman {money(installment.principal)} · Tenor {installment.term_months} bulan
                                                </p>
                                            </div>
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${installment.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                                            >
                                                {installment.status === 'paid' ? 'Lunas' : 'Belum dibayar'}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                                            <div>
                                                <p className="text-2xl font-bold text-gray-950">{money(installment.amount)}</p>
                                                <p className="mt-1 text-xs font-medium text-gray-600">Jatuh tempo {date(installment.due_date)}</p>
                                            </div>
                                            {installment.status === 'paid' ? (
                                                <p className="text-xs font-semibold text-emerald-800">
                                                    Dibayar {installment.paid_at ? date(installment.paid_at) : ''}
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        className="rounded-md bg-[#C5CECA] px-4 py-2 text-xs font-semibold text-gray-900 transition hover:bg-[#B7C0BC]"
                                                        onClick={() => setMethodModalOpen(true)}
                                                        type="button"
                                                    >
                                                        {selectedMethod?.label ?? 'Pilih metode pembayaran'}{' '}
                                                        <i aria-hidden="true" className="fa-solid fa-chevron-right ml-2" />
                                                    </button>
                                                    <button
                                                        className="rounded-md bg-[#6B8466] px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#596E54] disabled:opacity-60"
                                                        disabled={processingInstallment !== null || !paymentMethod}
                                                        onClick={() => payInstallment(installment.id)}
                                                        type="button"
                                                    >
                                                        {processingInstallment === installment.id
                                                            ? 'Memproses...'
                                                            : installment.latest_payment?.status === 'pending'
                                                              ? 'Lanjutkan checkout'
                                                              : 'Bayar'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                ))}
                                <p className="text-center text-xs text-gray-500">
                                    Pembayaran hanya menggunakan Midtrans Sandbox dan tidak memproses uang sungguhan.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border border-neutral-200/50 bg-white p-6 shadow-sm" data-purpose="monthly-streak">
                    <h3 className="text-sm font-bold text-gray-900">Bayar tepat waktu untuk mendapatkan bonus XP</h3>
                    <p className="mt-1 text-xs text-gray-600">Setiap cicilan yang dibayar paling lambat pada tanggal jatuh tempo menambah 20 XP.</p>
                    <div aria-label="Riwayat pembayaran 5 bulan terakhir" className="mt-5 flex gap-5">
                        {metrics.streak.map((paid, index) => (
                            <div className="flex flex-col items-center gap-1" key={index}>
                                <i
                                    aria-hidden="true"
                                    className={`fa-regular fa-calendar-check text-xl ${paid ? 'text-[#678263]' : 'text-gray-400'}`}
                                />
                                <span className="text-[10px] text-gray-500">{paid ? 'Lunas' : '—'}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-neutral-200/50 bg-white p-6 shadow-sm" data-purpose="reward-progress">
                    <h3 className="text-sm font-bold text-gray-900">Tukarkan 100 XP untuk voucher diskon sewa tenant 20%</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        Voucher berupa kode simulasi satu kali klaim. Modul pembayaran sewa tenant belum terintegrasi, jadi kode ini belum dapat
                        digunakan untuk memotong transaksi sewa.
                    </p>
                    <div className="mt-5 max-w-2xl">
                        <div className="mb-1.5 flex justify-between text-xs font-bold text-gray-700">
                            <span>{metrics.xp}/100 XP</span>
                            <span>{metrics.paid_installments} cicilan tepat waktu</span>
                        </div>
                        <div
                            aria-label={`${metrics.xp} dari 100 XP`}
                            className="h-2.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]"
                            role="progressbar"
                            aria-valuemax={100}
                            aria-valuemin={0}
                            aria-valuenow={metrics.xp}
                        >
                            <div className="h-full rounded-full bg-[#678263]" style={{ width: `${metrics.xp}%` }} />
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                            className="rounded-md bg-[#6B8466] px-6 py-2 text-xs font-semibold text-white transition hover:bg-[#596E54] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!metrics.can_claim_voucher}
                            onClick={claimVoucher}
                            type="button"
                        >
                            Klaim voucher 20%
                        </button>
                        {!metrics.can_claim_voucher && (
                            <span className="text-xs text-gray-600">Bayar 5 cicilan tepat waktu untuk membuka voucher.</span>
                        )}
                    </div>
                    {vouchers.length > 0 && (
                        <div className="mt-5 space-y-2">
                            <h4 className="text-xs font-bold text-gray-800">Voucher sewa yang sudah diklaim</h4>
                            {vouchers.map((voucher) => (
                                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#F6EFE5] px-4 py-3" key={voucher.id}>
                                    <code className="font-bold tracking-wide text-gray-900">{voucher.code}</code>
                                    <span className="text-xs text-gray-600">
                                        Diskon {voucher.discount_percentage}% ·{' '}
                                        {voucher.status === 'available' ? 'Belum digunakan' : 'Sudah digunakan'}
                                    </span>
                                    <button
                                        className="ml-auto rounded border border-[#688265] px-3 py-1 text-xs font-semibold text-[#52704d] hover:bg-white"
                                        onClick={() => copyVoucher(voucher.code)}
                                        type="button"
                                    >
                                        {copiedVoucher === voucher.code ? 'Tersalin' : 'Salin kode'}
                                    </button>
                                </div>
                            ))}
                            {copyError && (
                                <p className="text-xs text-red-600" role="alert">
                                    {copyError}
                                </p>
                            )}
                        </div>
                    )}
                </section>

                <section className="rounded-xl border border-neutral-200/50 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="font-bold text-gray-900">Rekening bank terdaftar</h3>
                            <p className="mt-1 text-xs text-gray-600">Nomor rekening disimpan terenkripsi dan hanya ditampilkan sebagian.</p>
                        </div>
                        <Link
                            className="rounded-md border border-[#688265] px-4 py-2 text-xs font-semibold text-[#52704d] hover:bg-[#F6EFE5]"
                            href="/tekumodal/bank-accounts/create"
                        >
                            Tambah rekening
                        </Link>
                    </div>
                    {bankAccounts.length > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {bankAccounts.map((account) => (
                                <div className="rounded-lg bg-[#F6EFE5] p-4 text-sm" key={account.id}>
                                    <p className="font-semibold text-gray-900">
                                        {account.bank_name} · {account.masked_number}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-600">{account.account_holder}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-gray-600">
                            Belum ada rekening bank. Tambahkan rekening sebelum mengajukan simulasi pinjaman.
                        </p>
                    )}
                </section>

                {loans.length > 0 && (
                    <section className="rounded-xl border border-neutral-200/50 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-bold text-gray-900">Riwayat simulasi pinjaman</h3>
                        <div className="space-y-3">
                            {loans.map((loan) => (
                                <div className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#F6EFE5] p-4 text-sm" key={loan.id}>
                                    <div>
                                        <p className="font-semibold">
                                            {money(loan.principal)} · {loan.term_months} bulan
                                        </p>
                                        <p className="mt-1 text-xs text-gray-600">
                                            Bunga flat {loan.monthly_interest_rate}%/bulan · Total bunga {money(loan.total_interest)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{money(loan.total_repayment)}</p>
                                        <p className="mt-1 text-xs text-gray-600">{loan.status === 'completed' ? 'Lunas' : 'Simulasi aktif'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
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
