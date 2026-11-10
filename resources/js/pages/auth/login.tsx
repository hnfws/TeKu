import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';

interface LoginProps {
    status?: string;
    canResetPassword?: boolean;
}

interface LoginForm {
    [key: string]: string | boolean;
    email: string;
    password: string;
    remember: boolean;
}

export default function Login({ status, canResetPassword = true }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 antialiased selection:bg-[#6D8766] selection:text-white bg-[#FAF4EB] font-sans" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
            <Head title="Halaman Masuk - Login" />

            {/* BEGIN: MainContent */}
            <main className="w-full max-w-[440px] flex flex-col items-center mx-auto" data-purpose="login-container">
                {/* BEGIN: LogoSection */}
                <section aria-label="Logo Brand" className="w-full mb-8 flex justify-center">
                    <img src="/assets/teku-auth-logo.png" alt="TeKu" className="h-[190px] w-full max-w-[390px] object-contain" />
                </section>
                {/* END: LogoSection */}

                {/* BEGIN: LoginFormSection */}
                <section aria-label="Formulir Masuk" className="w-full">
                    {status && (
                        <div className="mb-4 text-center text-sm font-medium text-green-600">
                            {status}
                        </div>
                    )}

                    <form className="w-full flex flex-col" data-purpose="login-form" onSubmit={submit}>
                        {/* Input: Email/No Telepon */}
                        <div className="mb-5">
                            <label className="block text-[15px] font-bold text-gray-950 mb-2 leading-none" htmlFor="identifier">
                                Email/No Telepon
                            </label>
                            <input
                                id="identifier"
                                name="email"
                                type="text"
                                required
                                autoComplete="username"
                                className="w-full h-[52px] px-4 rounded-xl bg-white border border-gray-100 text-gray-900 shadow-sm focus:border-[#6D8766] focus:outline-none focus:ring-2 focus:ring-[#6D8766]/20 text-base transition-all duration-200"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>

                        {/* Input: Kata Sandi */}
                        <div className="mb-5">
                            <label className="block text-[15px] font-bold text-gray-950 mb-2 leading-none" htmlFor="password">
                                Kata Sandi
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    className="w-full h-[52px] px-4 pr-12 rounded-xl bg-white border border-gray-100 text-gray-900 shadow-sm focus:border-[#6D8766] focus:outline-none focus:ring-2 focus:ring-[#6D8766]/20 text-base transition-all duration-200"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <button
                                    type="button"
                                    id="toggle-password"
                                    aria-label="Tampilkan atau sembunyikan kata sandi"
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 focus:outline-none ${showPassword ? 'text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </button>
                            </div>
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        {/* Row: Ingat Saya & Lupa Password */}
                        <div className="flex items-center justify-between mt-1 mb-7 text-sm" data-purpose="form-auxiliary-actions">
                            <div className="flex items-center space-x-2.5">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="w-4 h-4 rounded text-[#6D8766] border-gray-300 focus:ring-[#6D8766] focus:ring-offset-0 bg-[#D9D9D9] border-none cursor-pointer"
                                />
                                <label htmlFor="remember" className="font-bold text-gray-900 cursor-pointer select-none text-[14px]">
                                    Ingat Saya
                                </label>
                            </div>
                            <div>
                                {canResetPassword && (
                                    <Link href={route('password.request')} className="font-semibold text-blue-600 hover:text-blue-700 transition-colors text-[14px]">
                                        Lupa Password?
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Tombol Masuk */}
                        <div className="flex justify-center mb-6">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-60 h-[48px] bg-[#6D8766] hover:bg-[#5E7658] text-white font-semibold rounded-full shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center text-[15px] active:scale-[0.98] disabled:opacity-75"
                                data-purpose="submit-button"
                            >
                                Masuk
                            </button>
                        </div>

                        {/* Tautan Registrasi / Bawah */}
                        <div className="text-center text-[14px] text-gray-900 font-semibold" data-purpose="register-prompt">
                            Belum ada akun?{' '}
                            <Link href={route('register')} className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-semibold ml-1">
                                Bergabung sekarang!
                            </Link>
                        </div>
                    </form>
                </section>
                {/* END: LoginFormSection */}
            </main>
            {/* END: MainContent */}
        </div>
    );
}
