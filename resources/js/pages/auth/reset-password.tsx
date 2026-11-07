import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';

interface ResetPasswordProps {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="bg-[#F7EFE4] min-h-screen flex items-center justify-center p-4 sm:p-6 antialiased selection:bg-[#6E8A68] selection:text-white font-sans text-gray-900" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            <Head title="Reset Password" />

            {/* BEGIN: ResetPasswordContainer */}
            <main className="w-full max-w-[440px] flex flex-col items-center py-8" data-purpose="reset-password-card">
                {/* BEGIN: LogoSection */}
                <div className="w-[280px] h-[145px] bg-[#D5D7D8] flex items-center justify-center rounded-sm mb-7" data-purpose="logo-placeholder">
                    <span className="text-black font-semibold text-2xl tracking-tight">Logo</span>
                </div>
                {/* END: LogoSection */}

                {/* BEGIN: ResetPasswordForm */}
                <form className="w-full space-y-5" data-purpose="password-reset-form" onSubmit={submit}>
                    {/* Field 1: Email / No Telepon */}
                    <div className="space-y-1.5" data-purpose="identifier-field">
                        <label className="block text-sm font-bold text-gray-900 leading-tight" htmlFor="identifier">
                            Email/No Telepon
                        </label>
                        <input
                            id="identifier"
                            name="email"
                            type="text"
                            readOnly
                            className="w-full h-11 px-4 text-sm bg-transparent border-none focus:ring-0 focus:outline-none cursor-default font-medium text-gray-800 p-0"
                            value={data.email}
                        />
                        <InputError message={errors.email} />
                    </div>

                    {/* Field 2: Kata Sandi Baru */}
                    <div className="space-y-2" data-purpose="new-password-field">
                        <label className="block text-sm font-bold text-gray-900 leading-tight" htmlFor="new-password">
                            Kata Sandi Baru
                        </label>
                        <div className="relative">
                            <input
                                id="new-password"
                                name="password"
                                type="password"
                                required
                                className="w-full h-12 px-4 rounded-xl bg-white border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6E8A68]/60 text-gray-900 text-sm transition-all"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                        </div>
                        <InputError message={errors.password} />
                    </div>

                    {/* Field 3: Ulang Kata Sandi */}
                    <div className="space-y-2" data-purpose="confirm-password-field">
                        <label className="block text-sm font-bold text-gray-900 leading-tight" htmlFor="confirm-password">
                            Ulang Kata Sandi
                        </label>
                        <div className="relative">
                            <input
                                id="confirm-password"
                                name="password_confirmation"
                                type="password"
                                required
                                className="w-full h-12 px-4 rounded-xl bg-white border-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6E8A68]/60 text-gray-900 text-sm transition-all"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                            />
                        </div>
                        <InputError message={errors.password_confirmation} />
                    </div>

                    {/* Note / Helper Text */}
                    <p className="text-xs text-gray-700 leading-relaxed font-normal pt-1" data-purpose="helper-notice">
                        Harap mencatat atau mengingat kata sandi anda dengan hati hati
                    </p>

                    {/* Action Button */}
                    <div className="pt-4 flex flex-col items-center space-y-4" data-purpose="form-actions">
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-44 py-3 bg-[#6E8A68] hover:bg-[#5F7959] text-white font-medium text-sm rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6E8A68] active:scale-[0.98] disabled:opacity-75"
                        >
                            Masuk
                        </button>

                        {/* Back to Login Navigation Link */}
                        <Link
                            href={route('login')}
                            className="text-sm font-medium text-[#2563EB] hover:text-blue-700 hover:underline transition-colors focus:outline-none focus:underline"
                            data-purpose="back-to-login-link"
                        >
                            Kembali ke Login
                        </Link>
                    </div>
                </form>
                {/* END: ResetPasswordForm */}
            </main>
            {/* END: ResetPasswordContainer */}
        </div>
    );
}
