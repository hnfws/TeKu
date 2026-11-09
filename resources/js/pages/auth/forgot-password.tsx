import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';

export default function ForgotPassword({ status, otpSent }: { status?: string; otpSent: boolean }) {
    const [otpStep, setOtpStep] = useState(otpSent);
    const { data, setData, post, processing, errors, reset } = useForm({
        identifier: '',
        otp: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (otpStep) {
            post(route('password.store'), {
                onFinish: () => reset('password', 'password_confirmation'),
            });
            return;
        }

        post(route('password.email'), {
            onSuccess: () => setOtpStep(true),
        });
    };

    return (
        <div
            className="flex min-h-screen flex-col items-center justify-center bg-[#F7F1E8] px-4 py-8 font-sans antialiased selection:bg-[#6E8668] selection:text-white"
            style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
            <Head title="Lupa Password" />

            {/* BEGIN: ForgotPasswordCard */}
            <main className="-mt-16 flex w-full max-w-[440px] flex-col items-center sm:-mt-20" data-purpose="auth-container">
                {/* Logo placeholder block */}
                <div
                    className="mb-10 flex h-48 w-full items-center justify-center bg-[#D8D8D8] shadow-sm select-none sm:h-52"
                    data-purpose="logo-placeholder"
                >
                    <span className="text-3xl font-bold tracking-tight text-black sm:text-4xl">Logo</span>
                </div>

                {/* BEGIN: VerificationForm */}
                <form className="flex w-full flex-col" data-purpose="verification-form" onSubmit={submit}>
                    {status && <div className="mb-4 text-center text-sm font-medium text-green-600">{status}</div>}

                    {!otpStep ? (
                        <div className="mb-8 w-full" data-purpose="input-group">
                            <label className="mb-2.5 block text-sm font-semibold text-black sm:text-base" htmlFor="identifier">
                                Email/No telepon
                            </label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                required
                                autoComplete="username"
                                className="h-12 w-full rounded-xl border-0 bg-white px-5 text-base text-gray-800 shadow-sm transition duration-150 ease-in-out focus:ring-2 focus:ring-[#6E8668] focus:outline-none sm:h-14 sm:rounded-2xl"
                                value={data.identifier}
                                onChange={(e) => setData('identifier', e.target.value)}
                            />
                            <InputError message={errors.identifier} className="mt-1" />
                        </div>
                    ) : (
                        <div className="mb-8 w-full space-y-4" data-purpose="otp-reset-form">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-black" htmlFor="otp">
                                    Kode OTP
                                </label>
                                <input
                                    autoComplete="one-time-code"
                                    className="h-12 w-full rounded-xl border-0 bg-white px-5 text-base text-gray-800 shadow-sm focus:ring-2 focus:ring-[#6E8668] focus:outline-none"
                                    id="otp"
                                    inputMode="numeric"
                                    maxLength={6}
                                    onChange={(e) => setData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    value={data.otp}
                                />
                                <InputError message={errors.otp} className="mt-1" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-black" htmlFor="new-password">
                                    Password Baru
                                </label>
                                <input
                                    autoComplete="new-password"
                                    className="h-12 w-full rounded-xl border-0 bg-white px-5 text-base text-gray-800 shadow-sm focus:ring-2 focus:ring-[#6E8668] focus:outline-none"
                                    id="new-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    type="password"
                                    value={data.password}
                                />
                                <InputError message={errors.password} className="mt-1" />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-black" htmlFor="password-confirmation">
                                    Konfirmasi Password Baru
                                </label>
                                <input
                                    autoComplete="new-password"
                                    className="h-12 w-full rounded-xl border-0 bg-white px-5 text-base text-gray-800 shadow-sm focus:ring-2 focus:ring-[#6E8668] focus:outline-none"
                                    id="password-confirmation"
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                    type="password"
                                    value={data.password_confirmation}
                                />
                                <InputError message={errors.password_confirmation} className="mt-1" />
                            </div>
                            <button
                                className="text-sm font-medium text-[#2F6BE3] hover:underline"
                                onClick={() => {
                                    setOtpStep(false);
                                    setData('otp', '');
                                    setData('password', '');
                                    setData('password_confirmation', '');
                                }}
                                type="button"
                            >
                                Gunakan Email/No telepon lain
                            </button>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="mb-6 flex justify-center" data-purpose="submit-container">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center justify-center rounded-full bg-[#6E8668] px-9 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#5E7558] active:scale-[0.98] disabled:opacity-75 sm:text-base"
                            data-purpose="submit-button"
                        >
                            {otpStep ? 'Atur Ulang Password' : 'Kirim Kode Verifikasi'}
                        </button>
                    </div>

                    {/* Back to Login Navigation Link */}
                    <div className="text-center" data-purpose="navigation-link">
                        <Link
                            href={route('login')}
                            className="text-sm font-medium text-[#2F6BE3] transition-colors duration-150 hover:text-blue-700 hover:underline"
                        >
                            Kembali ke Login
                        </Link>
                    </div>
                </form>
                {/* END: VerificationForm */}
            </main>
            {/* END: ForgotPasswordCard */}
        </div>
    );
}
