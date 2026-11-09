import { Link, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import ManagementLayout from '@/layouts/management-layout';

interface LoanFormProps {
    availableLimit: number;
    creditLimit: number;
    minimumLoan: number;
    monthlyInterestRate: number;
    terms: number[];
    initialPrincipal: number | '';
    initialTermMonths: number;
    bankAccounts: { id: number; bank_name: string; account_holder: string; masked_number: string }[];
    interestVouchers: { id: number; code: string; type: string; interest_rate: string }[];
    selectedVoucherId: number | null;
}

type LoanFormData = {
    principal: number | '';
    term_months: number;
    bank_account_id: number | '';
    tekumodal_voucher_id: number | '';
};
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const fieldClass =
    'w-full rounded-none border-0 bg-[#D6D6D6] px-4 text-sm text-neutral-800 outline-none transition focus:bg-[#e5e5e5] focus:ring-1 focus:ring-[#668263]';

export default function TeKuModalLoanForm({
    availableLimit,
    creditLimit,
    minimumLoan,
    monthlyInterestRate,
    terms,
    initialPrincipal,
    initialTermMonths,
    bankAccounts,
    interestVouchers,
    selectedVoucherId,
}: LoanFormProps) {
    const form = useForm<LoanFormData>({
        principal: initialPrincipal,
        term_months: initialTermMonths,
        bank_account_id: '',
        tekumodal_voucher_id: selectedVoucherId ?? '',
    });
    const errors = form.errors as Record<string, string | undefined>;
    const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
    const bankDropdownRef = useRef<HTMLDivElement>(null);
    const selectedBank = bankAccounts.find((account) => account.id === Number(form.data.bank_account_id));
    const selectedInterestVoucher = interestVouchers.find((voucher) => voucher.id === Number(form.data.tekumodal_voucher_id));
    const effectiveMonthlyInterestRate = selectedInterestVoucher?.interest_rate ?? String(monthlyInterestRate);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.data.bank_account_id) {
            form.setError('bank_account_id', 'Pilih rekening bank terlebih dahulu.');
            return;
        }
        form.post('/tekumodal/loans');
    };

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (event.target instanceof Node && !bankDropdownRef.current?.contains(event.target)) {
                setBankDropdownOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setBankDropdownOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, []);

    return (
        <ManagementLayout title="Ajukan Pinjaman - TeKuModal">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6 flex items-center gap-3">
                    <Link
                        aria-label="Kembali ke TeKuModal"
                        className="inline-flex items-center text-2xl font-bold text-black transition-opacity hover:opacity-75"
                        href="/tekumodal"
                    >
                        &lt;
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight text-black">Ajukan Pinjaman</h1>
                </header>
                <div className="overflow-hidden rounded-xl border border-stone-200/40 bg-white shadow-sm">
                    <section className="bg-[#668263] px-6 pt-8 pb-7 text-center text-white">
                        <h2 className="text-base font-semibold tracking-wide text-white/95">Limit Tersedia</h2>
                        <p className="my-2 text-3xl font-bold tracking-tight sm:text-4xl">{money(availableLimit)}</p>
                        <p className="text-xs font-normal text-white/90">Total Limit {money(creditLimit)}</p>
                        <p className="mt-1 mb-5 text-[11px] font-normal text-white/80">
                            Kamu dapat mengajukan pinjaman modal menggunakan limit yang tersedia
                        </p>
                        <Link
                            className="inline-flex items-center gap-2 rounded-sm bg-[#F4EFE6] px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-neutral-100"
                            href="/tekumodal?simulator=1"
                        >
                            <i aria-hidden="true" className="fa-solid fa-calculator" />
                            Simulasi Pinjaman
                        </Link>
                    </section>
                    {availableLimit < minimumLoan && (
                        <div className="mx-6 mt-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-8">
                            Limit tersedia belum memenuhi minimum pinjaman {money(minimumLoan)}.
                        </div>
                    )}
                    <form className="space-y-6 bg-white p-6 md:p-8" onSubmit={submit}>
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-neutral-900" htmlFor="principal">
                                Masukkan Jumlah Pinjaman
                            </label>
                            <span className="block text-xs font-normal text-neutral-700">
                                Tersedia mulai dari {money(minimumLoan)} · Maksimum {money(availableLimit)}
                            </span>
                            <div className="pt-1.5">
                                <input
                                    className={`${fieldClass} h-10 max-w-sm px-3 py-2`}
                                    id="principal"
                                    max={availableLimit}
                                    min={minimumLoan}
                                    onChange={(event) => form.setData('principal', event.target.value === '' ? '' : Number(event.target.value))}
                                    required
                                    step="1"
                                    type="number"
                                    value={form.data.principal}
                                />
                            </div>
                            {errors.principal && <p className="text-xs text-red-600">{errors.principal}</p>}
                        </div>
                        <fieldset className="space-y-2 pt-1">
                            <legend className="block text-sm font-bold text-neutral-900">Pilih Durasi Pinjaman</legend>
                            <div className="grid max-w-3xl grid-cols-1 gap-4 pt-1 sm:grid-cols-3 sm:gap-6">
                                {terms.map((term) => (
                                    <label className="cursor-pointer" key={term}>
                                        <input
                                            checked={form.data.term_months === term}
                                            className="peer sr-only"
                                            name="term_months"
                                            onChange={() => form.setData('term_months', term)}
                                            type="radio"
                                            value={term}
                                        />
                                        <span className="flex w-full items-center justify-center bg-[#668263] py-2 text-sm font-medium text-white transition peer-not-checked:bg-[#668263]/95 peer-checked:bg-[#668263] peer-hover:brightness-105 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#668263]">
                                            {term} Bulan
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {errors.term_months && <p className="text-xs text-red-600">{errors.term_months}</p>}
                        </fieldset>
                        {interestVouchers.length > 0 && (
                            <div className="space-y-2 pt-1">
                                <label className="block text-sm font-bold text-neutral-900" htmlFor="tekumodal-voucher">
                                    Gunakan voucher bunga
                                </label>
                                <select
                                    className={`${fieldClass} h-10 max-w-sm px-3 py-2`}
                                    id="tekumodal-voucher"
                                    onChange={(event) => form.setData('tekumodal_voucher_id', event.target.value ? Number(event.target.value) : '')}
                                    value={form.data.tekumodal_voucher_id}
                                >
                                    <option value="">Tanpa voucher · {monthlyInterestRate}% per bulan</option>
                                    {interestVouchers.map((voucher) => (
                                        <option key={voucher.id} value={voucher.id}>
                                            {voucher.type === 'first_loan_interest' ? 'Pinjaman pertama' : 'Voucher TeKuModal'} ·{' '}
                                            {voucher.interest_rate}% per bulan
                                        </option>
                                    ))}
                                </select>
                                {errors.tekumodal_voucher_id && <p className="text-xs text-red-600">{errors.tekumodal_voucher_id}</p>}
                                <p className="text-xs text-neutral-700">Bunga yang digunakan: {effectiveMonthlyInterestRate}% per bulan.</p>
                            </div>
                        )}
                        <div className="relative space-y-1 pt-1" ref={bankDropdownRef}>
                            <label className="block text-sm font-bold text-neutral-900" id="bank-account-label">
                                Pilih Rekening Bank
                            </label>
                            {bankAccounts.length > 0 ? (
                                <>
                                    <button
                                        aria-expanded={bankDropdownOpen}
                                        aria-haspopup="listbox"
                                        aria-labelledby="bank-account-label"
                                        className="flex h-9 w-44 items-center justify-between bg-[#D6D6D6] px-3 text-xs text-neutral-800 transition-colors hover:bg-neutral-300 focus:ring-1 focus:ring-[#668263]"
                                        id="bank-account"
                                        onClick={() => setBankDropdownOpen((open) => !open)}
                                        type="button"
                                    >
                                        <span className="truncate">{selectedBank?.account_holder ?? 'Pilih'}</span>
                                        <span aria-hidden="true" className="ml-2 font-bold">
                                            &gt;
                                        </span>
                                    </button>
                                    {bankDropdownOpen && (
                                        <div
                                            aria-labelledby="bank-account-label"
                                            className="absolute top-[4.5rem] left-0 z-30 w-64 border border-neutral-300 bg-[#D9D9D9] text-xs shadow-md"
                                            role="listbox"
                                        >
                                            <div className="border-b border-neutral-400 bg-neutral-300 px-3 py-2 font-bold text-black">
                                                Rekening terdaftar
                                            </div>
                                            {bankAccounts.map((account) => (
                                                <button
                                                    aria-selected={form.data.bank_account_id === account.id}
                                                    className="block w-full border-b border-neutral-400 px-3 py-2 text-left transition last:border-0 hover:bg-neutral-200"
                                                    key={account.id}
                                                    onClick={() => {
                                                        form.setData('bank_account_id', account.id);
                                                        form.clearErrors('bank_account_id');
                                                        setBankDropdownOpen(false);
                                                    }}
                                                    role="option"
                                                    type="button"
                                                >
                                                    <span className="block leading-tight font-semibold text-neutral-900">
                                                        {account.account_holder}
                                                    </span>
                                                    <span className="block leading-tight text-neutral-700">{account.bank_name}</span>
                                                    <span className="block leading-tight text-neutral-700">{account.masked_number}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {selectedBank && (
                                        <p className="pt-1 text-xs text-neutral-700">
                                            {selectedBank.bank_name} · {selectedBank.masked_number}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="pt-1 text-xs text-neutral-900">
                                    Rekening Bank belum terdaftar?{' '}
                                    <Link className="text-blue-600 hover:underline" href="/tekumodal/bank-accounts/create">
                                        Tambahkan rekening bank
                                    </Link>
                                </p>
                            )}
                            {errors.bank_account_id && <p className="text-xs text-red-600">{errors.bank_account_id}</p>}
                            {bankAccounts.length > 0 && (
                                <p className="pt-1 text-xs text-neutral-900">
                                    Rekening Bank belum terdaftar?{' '}
                                    <Link className="text-blue-600 hover:underline" href="/tekumodal/bank-accounts/create">
                                        Tambahkan rekening bank
                                    </Link>
                                </p>
                            )}
                        </div>
                        <p className="mx-auto max-w-xl pt-8 text-center text-[11px] leading-relaxed font-normal text-red-500">
                            Pengajuan ini hanya simulasi. Tidak ada dana yang dicairkan, pembayaran pinjaman sungguhan, atau transaksi uang nyata.
                        </p>
                        <div className="flex justify-center pb-3">
                            <button
                                className="bg-[#668263] px-8 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#556d53] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={form.processing || bankAccounts.length === 0 || availableLimit < minimumLoan}
                                type="submit"
                            >
                                {form.processing ? 'Memproses...' : 'Konfirmasi dan Kirim'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ManagementLayout>
    );
}
