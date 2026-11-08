import { Link, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

import ManagementLayout from '@/layouts/management-layout';

interface BankAccountFormProps {
    banks: string[];
}

type BankFormData = {
    account_holder: string;
    account_number: string;
    bank_name: string;
    branch_name: string;
    city: string;
};

const fieldClass =
    'h-11 w-full rounded-none border-0 bg-[#D5D7D8] px-4 text-sm text-neutral-800 outline-none focus:bg-white focus:ring-2 focus:ring-[#6A8367]/30';

export default function TeKuModalBankAccountForm({ banks }: BankAccountFormProps) {
    const form = useForm<BankFormData>({ account_holder: '', account_number: '', bank_name: '', branch_name: '', city: '' });
    const errors = form.errors as Record<string, string | undefined>;
    const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
    const bankDropdownRef = useRef<HTMLDivElement>(null);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.data.bank_name) {
            form.setError('bank_name', 'Pilih nama bank terlebih dahulu.');
            return;
        }
        form.post('/tekumodal/bank-accounts');
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
        <ManagementLayout title="Tambah Rekening Bank - TeKuModal">
            <div className="mx-auto max-w-6xl">
                <header className="mb-8 flex items-center gap-3">
                    <Link
                        aria-label="Kembali ke TeKuModal"
                        className="inline-flex items-center text-2xl font-bold text-black transition-opacity hover:opacity-75"
                        href="/tekumodal"
                    >
                        &lt;
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Tambah Rekening Bank</h1>
                </header>
                <section className="max-w-5xl overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
                    <div className="bg-[#6A8367] px-8 py-5">
                        <h2 className="text-lg font-bold tracking-wide text-white">Informasi Rekening</h2>
                    </div>
                    <form className="flex flex-col gap-6 p-6 sm:p-8" onSubmit={submit}>
                        <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-900" htmlFor="account-holder">
                            Masukkan Nama Lengkap di Rekening Bank
                            <input
                                autoComplete="name"
                                className={fieldClass}
                                id="account-holder"
                                maxLength={255}
                                onChange={(event) => form.setData('account_holder', event.target.value)}
                                required
                                value={form.data.account_holder}
                            />
                            {errors.account_holder && <span className="text-xs font-normal text-red-600">{errors.account_holder}</span>}
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-900" htmlFor="account-number">
                            Nomor Rekening Bank
                            <input
                                autoComplete="off"
                                className={fieldClass}
                                id="account-number"
                                inputMode="numeric"
                                maxLength={34}
                                onChange={(event) => form.setData('account_number', event.target.value)}
                                pattern="[0-9 -]{5,34}"
                                required
                                value={form.data.account_number}
                            />
                            <span className="text-xs font-normal text-neutral-600">Nomor rekening akan disimpan terenkripsi.</span>
                            {errors.account_number && <span className="text-xs font-normal text-red-600">{errors.account_number}</span>}
                        </label>
                        <div className="relative flex flex-col gap-2 text-sm font-semibold text-neutral-900" ref={bankDropdownRef}>
                            <span id="bank-name-label">Nama Bank</span>
                            <button
                                aria-expanded={bankDropdownOpen}
                                aria-haspopup="listbox"
                                aria-labelledby="bank-name-label"
                                className={`${fieldClass} flex items-center justify-between text-left text-neutral-700 transition-colors hover:bg-neutral-300`}
                                id="bank-name"
                                onClick={() => setBankDropdownOpen((open) => !open)}
                                type="button"
                            >
                                <span>{form.data.bank_name || 'Pilih'}</span>
                                <span aria-hidden="true" className="font-bold">
                                    &gt;
                                </span>
                            </button>
                            {bankDropdownOpen && (
                                <div
                                    aria-labelledby="bank-name-label"
                                    className="absolute top-[4.75rem] left-0 z-30 max-h-64 w-72 divide-y divide-black overflow-y-auto border border-black bg-[#D5D7D8] shadow-2xl"
                                    role="listbox"
                                >
                                    {banks.map((bank) => (
                                        <button
                                            aria-selected={form.data.bank_name === bank}
                                            className="block w-full px-4 py-2 text-left text-sm font-bold text-black transition-colors hover:bg-[#c2c5c7]"
                                            key={bank}
                                            onClick={() => {
                                                form.setData('bank_name', bank);
                                                form.clearErrors('bank_name');
                                                setBankDropdownOpen(false);
                                            }}
                                            role="option"
                                            type="button"
                                        >
                                            {bank}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {errors.bank_name && <span className="text-xs font-normal text-red-600">{errors.bank_name}</span>}
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-900" htmlFor="branch-name">
                                Nama Cabang
                                <input
                                    className={fieldClass}
                                    id="branch-name"
                                    maxLength={150}
                                    onChange={(event) => form.setData('branch_name', event.target.value)}
                                    value={form.data.branch_name}
                                />
                                {errors.branch_name && <span className="text-xs font-normal text-red-600">{errors.branch_name}</span>}
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-semibold text-neutral-900" htmlFor="city">
                                Kota
                                <input
                                    className={fieldClass}
                                    id="city"
                                    maxLength={100}
                                    onChange={(event) => form.setData('city', event.target.value)}
                                    value={form.data.city}
                                />
                                {errors.city && <span className="text-xs font-normal text-red-600">{errors.city}</span>}
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-6 pb-2">
                            <button
                                className="w-32 rounded-md bg-[#617A5D] py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#53694f] disabled:opacity-60"
                                disabled={form.processing}
                                type="submit"
                            >
                                {form.processing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            <Link
                                className="w-32 rounded-md bg-[#D33E37] py-2 text-center text-sm font-medium text-white shadow-sm transition hover:bg-[#ba322c]"
                                href="/tekumodal"
                            >
                                Batal
                            </Link>
                        </div>
                    </form>
                </section>
            </div>
        </ManagementLayout>
    );
}
