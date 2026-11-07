import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 antialiased selection:bg-[#6D8766] selection:text-white bg-[#FAF4EB] font-sans">
            <Head title="Pendaftaran Akun - Registrasi" />

            <main className="w-full max-w-[440px] flex flex-col items-center mx-auto" data-purpose="register-container">
                {/* Logo Section */}
                <section aria-label="Logo Brand" className="w-full mb-8 flex justify-center">
                    <div className="w-full max-w-[390px] h-[190px] bg-[#D8DBDF] rounded-sm flex items-center justify-center select-none shadow-sm">
                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
                            Logo
                        </span>
                    </div>
                </section>

                {/* Form Section */}
                <section aria-label="Formulir Pendaftaran" className="w-full">
                    <form className="w-full flex flex-col" onSubmit={submit}>
                        {/* Input: Nama Lengkap */}
                        <div className="mb-5">
                            <label className="block text-[15px] font-bold text-gray-950 mb-2 leading-none" htmlFor="name">
                                Nama Lengkap
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                autoComplete="name"
                                className="w-full h-[52px] px-4 rounded-xl bg-white border border-gray-100 text-gray-900 shadow-sm focus:border-[#6D8766] focus:outline-none focus:ring-2 focus:ring-[#6D8766]/20 text-base transition-all duration-200"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            <InputError message={errors.name} className="mt-1" />
                        </div>

                        {/* Input: Email/No Telepon */}
                        <div className="mb-5">
                            <label className="block text-[15px] font-bold text-gray-950 mb-2 leading-none" htmlFor="email">
                                Email/No Telepon
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
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
                                    autoComplete="new-password"
                                    className="w-full h-[52px] px-4 pr-12 rounded-xl bg-white border border-gray-100 text-gray-900 shadow-sm focus:border-[#6D8766] focus:outline-none focus:ring-2 focus:ring-[#6D8766]/20 text-base transition-all duration-200"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <button
                                    type="button"
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 focus:outline-none ${showPassword ? 'text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </button>
                            </div>
                            <InputError message={errors.password} className="mt-1" />
                        </div>

                        {/* Input: Ulangi Kata Sandi */}
                        <div className="mb-7">
                            <label className="block text-[15px] font-bold text-gray-950 mb-2 leading-none" htmlFor="password_confirmation">
                                Ulang Kata Sandi
                            </label>
                            <input
                                id="password_confirmation"
                                name="password_confirmation"
                                type={showPassword ? 'text' : 'password'}
                                required
                                autoComplete="new-password"
                                className="w-full h-[52px] px-4 rounded-xl bg-white border border-gray-100 text-gray-900 shadow-sm focus:border-[#6D8766] focus:outline-none focus:ring-2 focus:ring-[#6D8766]/20 text-base transition-all duration-200"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                            />
                            <InputError message={errors.password_confirmation} className="mt-1" />
                        </div>

                        {/* Tombol Daftar */}
                        <div className="flex justify-center mb-6">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-60 h-[48px] bg-[#6D8766] hover:bg-[#5E7658] text-white font-semibold rounded-full shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center text-[15px] active:scale-[0.98] disabled:opacity-75"
                            >
                                Daftar
                            </button>
                        </div>

                        {/* Tautan Login */}
                        <div className="text-center text-[14px] text-gray-900 font-semibold">
                            Sudah punya akun?{' '}
                            <Link href={route('login')} className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-semibold ml-1">
                                Masuk sekarang!
                            </Link>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}
