import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <div className="bg-[#F7F1E8] min-h-screen flex flex-col justify-center items-center px-4 py-8 antialiased selection:bg-[#6E8668] selection:text-white font-sans" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <Head title="Lupa Password" />

            {/* BEGIN: ForgotPasswordCard */}
            <main className="w-full max-w-[440px] flex flex-col items-center -mt-16 sm:-mt-20" data-purpose="auth-container">
                {/* Logo placeholder block */}
                <div className="w-full h-48 sm:h-52 bg-[#D8D8D8] flex items-center justify-center mb-10 select-none shadow-sm" data-purpose="logo-placeholder">
                    <span className="text-3xl sm:text-4xl font-bold tracking-tight text-black">Logo</span>
                </div>

                {/* BEGIN: VerificationForm */}
                <form className="w-full flex flex-col" data-purpose="verification-form" onSubmit={submit}>
                    {status && (
                        <div className="mb-4 text-center text-sm font-medium text-green-600">
                            {status}
                        </div>
                    )}

                    {/* Input Group: Email / No Telepon */}
                    <div className="w-full mb-8" data-purpose="input-group">
                        <label className="block text-sm sm:text-base font-semibold text-black mb-2.5" htmlFor="identifier">
                            Email/No Telepon
                        </label>
                        <input
                            id="identifier"
                            name="email"
                            type="text"
                            required
                            autoComplete="username"
                            className="w-full h-12 sm:h-14 px-5 bg-white rounded-xl sm:rounded-2xl border-0 shadow-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6E8668] transition duration-150 ease-in-out text-base"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        <InputError message={errors.email} className="mt-1" />
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center mb-6" data-purpose="submit-container">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center justify-center px-9 py-3 bg-[#6E8668] hover:bg-[#5E7558] active:scale-[0.98] text-white font-medium text-sm sm:text-base rounded-full shadow-sm transition-all duration-200 disabled:opacity-75"
                            data-purpose="submit-button"
                        >
                            Kirim Kode Verifikasi
                        </button>
                    </div>

                    {/* Back to Login Navigation Link */}
                    <div className="text-center" data-purpose="navigation-link">
                        <Link
                            href={route('login')}
                            className="text-sm font-medium text-[#2F6BE3] hover:text-blue-700 hover:underline transition-colors duration-150"
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
