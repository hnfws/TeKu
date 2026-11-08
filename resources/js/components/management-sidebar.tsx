import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface ManagementSidebarProps {
    className?: string;
    onNavigate?: () => void;
}

const navigation = [
    { title: 'Dashboard', href: '/dashboard', icon: 'fa-table-cells-large', active: (path: string) => path === '/dashboard' },
    { title: 'Persediaan', href: '/inventory', icon: 'fa-boxes-stacked', active: (path: string) => path.startsWith('/inventory') },
    { title: 'Penjualan', href: '/sales', icon: 'fa-cash-register', active: (path: string) => path.startsWith('/sales') },
    { title: 'Promo', href: '/promotions', icon: 'fa-ticket', active: (path: string) => path.startsWith('/promotions') },
    { title: 'Event', href: '/event-dashboard', icon: 'fa-calendar-days', active: (path: string) => path === '/event-dashboard' },
    { title: 'TeKuModal', href: '/tekumodal', icon: 'fa-wallet', active: (path: string) => path.startsWith('/tekumodal') },
];

export default function ManagementSidebar({ className = '', onNavigate }: ManagementSidebarProps) {
    const { url, props } = usePage<{ auth: { user: { email: string } } }>();
    const path = url.split('?')[0];
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`${className} ${collapsed ? 'w-[84px]' : 'w-64'} h-screen shrink-0 flex-col justify-between overflow-hidden bg-[#688463] px-4 py-6 text-white transition-[width]`}
            data-purpose="shared-sidebar"
        >
            <div>
                <div className="mb-6 flex items-center gap-3">
                    <button
                        aria-label={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
                        className="rounded-md p-2 hover:bg-white/10 focus:ring-2 focus:ring-white/60 focus:outline-none"
                        onClick={() => setCollapsed(!collapsed)}
                        type="button"
                    >
                        <i className="fa-solid fa-bars text-lg" />
                    </button>
                    {!collapsed && (
                        <div className="flex h-12 flex-1 items-center justify-center rounded-lg bg-[#f8f6f0] text-sm font-medium tracking-wide text-gray-800 shadow-sm">
                            Logo
                        </div>
                    )}
                </div>
                <div className="mb-5 h-px bg-white/20" />
                <nav aria-label="Navigasi utama" className="space-y-1.5">
                    {navigation.map((item) => {
                        const active = item.active(path);
                        return (
                            <Link
                                key={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${active ? 'bg-[#f6f2ec] font-bold text-gray-900 shadow-sm' : 'font-medium text-white/90 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center' : ''}`}
                                href={item.href}
                                onClick={onNavigate}
                                title={collapsed ? item.title : undefined}
                            >
                                <i className={`fa-solid ${item.icon} w-5 shrink-0 text-center`} />
                                {!collapsed && <span>{item.title}</span>}
                            </Link>
                        );
                    })}
                    <Link
                        className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : ''}`}
                        href="/settings/profile"
                        onClick={onNavigate}
                        title={collapsed ? 'Pengaturan' : undefined}
                    >
                        <i className="fa-solid fa-gear w-5 shrink-0 text-center" />
                        {!collapsed && <span>Pengaturan</span>}
                    </Link>
                </nav>
            </div>

            <div className="space-y-2 border-t border-white/15 pt-4">
                <Link
                    className={`flex items-center gap-3 rounded-lg px-2 py-2 text-xs text-white/90 hover:bg-white/10 ${collapsed ? 'justify-center' : ''}`}
                    href="/settings/profile"
                    onClick={onNavigate}
                    title={collapsed ? 'Profil' : undefined}
                >
                    <i className="fa-regular fa-user w-5 shrink-0 text-center" />
                    {!collapsed && <span className="truncate">{props.auth.user.email}</span>}
                </Link>
                <Link
                    as="button"
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs text-white/90 hover:bg-white/10 ${collapsed ? 'justify-center' : ''}`}
                    href="/logout"
                    method="post"
                    onClick={onNavigate}
                    title={collapsed ? 'Keluar' : undefined}
                >
                    <i className="fa-solid fa-arrow-right-from-bracket w-5 shrink-0 text-center" />
                    {!collapsed && <span>Keluar</span>}
                </Link>
            </div>
        </aside>
    );
}
