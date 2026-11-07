import { Head } from '@inertiajs/react';
import { type ReactNode, useState } from 'react';

import ManagementSidebar from '@/components/management-sidebar';

interface ManagementLayoutProps {
    children: ReactNode;
    title: string;
}

export default function ManagementLayout({ children, title }: ManagementLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="h-screen overflow-hidden bg-[#f6f2ec] text-gray-800 antialiased" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Head title={title} />
            <div className="flex h-full min-h-0">
                {sidebarOpen && (
                    <button
                        aria-label="Tutup menu"
                        className="fixed inset-0 z-30 bg-black/40 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                        type="button"
                    />
                )}
                <ManagementSidebar
                    className={sidebarOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden md:flex'}
                    onNavigate={() => setSidebarOpen(false)}
                />
                <main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <button
                        aria-label="Buka menu navigasi"
                        className="mb-4 rounded-lg p-2 text-[#688463] hover:bg-white md:hidden"
                        onClick={() => setSidebarOpen(true)}
                        type="button"
                    >
                        <i className="fa-solid fa-bars text-lg" />
                    </button>
                    {children}
                </main>
            </div>
        </div>
    );
}
