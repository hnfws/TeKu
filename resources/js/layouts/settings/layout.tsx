import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

const settingsTabs = [
    { title: 'Profil', href: '/settings/profile' },
    { title: 'Keamanan Akun', href: '/settings/password' },
    { title: 'Rekening & Pembayaran', href: '/settings/bank-accounts' },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
    const { url } = usePage();
    const currentPath = url.split('?')[0];

    return (
        <div className="mx-auto max-w-[1440px] space-y-8">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Pengaturan</h1>
            </header>

            <section className="flex min-h-[540px] flex-col overflow-hidden rounded-xl bg-white shadow-sm md:flex-row">
                <aside className="shrink-0 border-b border-stone-200 p-4 md:w-[230px] md:border-r md:border-b-0 md:p-6">
                    <nav aria-label="Pengaturan akun" className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
                        {settingsTabs.map((tab) => {
                            const active = currentPath === tab.href;

                            return (
                                <Link
                                    key={tab.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                                        active ? 'bg-[#f6f0e7] text-stone-900' : 'text-stone-700 hover:bg-stone-50'
                                    }`}
                                    href={tab.href}
                                >
                                    {tab.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <div className="min-w-0 flex-1 p-5 sm:p-8">
                    <div className="max-w-[620px]">{children}</div>
                </div>
            </section>
        </div>
    );
}
