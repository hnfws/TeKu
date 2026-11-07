import { Head, Link } from '@inertiajs/react';

export default function PasswordChangedSuccess() {
    return (
        <div className="bg-[#f8f4ec] font-sans text-gray-900 min-h-screen flex items-center justify-center p-4 selection:bg-[#688463] selection:text-white" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            <main className="w-full max-w-2xl flex flex-col items-center justify-center text-center py-12 px-4">
                <Head title="Kata Sandi Berhasil Diubah" />

                <div className="mb-8 flex items-center justify-center">
                    <svg className="w-36 h-44 sm:w-44 sm:h-52 text-[#688463] transition-transform duration-300 hover:scale-105" fill="none" viewBox="0 0 160 190" xmlns="http://www.w3.org/2000/svg">
                        <path d="M80 0C108 28 140 32 160 36V100C160 146 116 178 80 190C44 178 0 146 0 100V36C20 32 52 28 80 0Z" fill="currentColor"></path>
                        <path d="M48 94L71 117L114 74" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15"></path>
                    </svg>
                </div>

                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#668261] tracking-tight mb-7 leading-snug">
                    Selamat, kata sandi anda berhasil diubah!
                </h1>

                <p className="text-[14.5px] sm:text-[15.5px] font-semibold text-black tracking-normal leading-relaxed max-w-xl mb-9 opacity-95">
                    Password anda berhasil di ubah. Silahkan lakukan login kembali melalui menu login.
                </p>

                <div>
                    <Link
                        href={route('login')}
                        className="inline-flex items-center justify-center px-10 py-3 bg-[#688463] hover:bg-[#5a7356] text-white font-medium text-[15px] rounded-full shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#688463]"
                    >
                        Kembali ke Login
                    </Link>
                </div>
            </main>
        </div>
    );
}
