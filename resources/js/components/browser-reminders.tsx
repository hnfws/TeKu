import { useEffect, useState } from 'react';

interface BrowserRemindersProps {
    enabled: boolean;
    publicKey: string | null;
}

function decodeVapidKey(value: string): Uint8Array {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const decoded = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export default function BrowserReminders({ enabled, publicKey }: BrowserRemindersProps) {
    const [supported, setSupported] = useState(false);
    const [active, setActive] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const available = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        setSupported(available);
        if (!available) return;

        navigator.serviceWorker.getRegistration('/service-worker.js')
            .then((registration) => registration?.pushManager.getSubscription())
            .then((subscription) => setActive(Boolean(subscription)))
            .catch(() => setMessage('Status pengingat browser tidak dapat dimuat.'));
    }, []);

    const toggle = async () => {
        setBusy(true);
        setMessage('');
        try {
            if (!supported) throw new Error('Browser ini belum mendukung notifikasi push.');
            const registration = active
                ? await navigator.serviceWorker.getRegistration('/service-worker.js')
                : enabled && publicKey
                    ? await navigator.serviceWorker.register('/service-worker.js')
                    : null;
            if (!registration) throw new Error('Notifikasi browser belum dikonfigurasi oleh server.');
            const current = await registration.pushManager.getSubscription();
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
            if (!csrfToken) throw new Error('Token keamanan tidak ditemukan. Muat ulang halaman lalu coba kembali.');

            if (current) {
                const response = await fetch('/calendar/push-subscriptions', {
                    method: 'DELETE',
                    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify({ endpoint: current.endpoint }),
                });
                if (!response.ok) throw new Error('Pengaturan pengingat browser gagal diperbarui.');
                await current.unsubscribe();
                setActive(false);
                setMessage('Pengingat browser dinonaktifkan.');
                return;
            }

            if (!enabled || !publicKey) throw new Error('Notifikasi browser belum dikonfigurasi oleh server.');
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') throw new Error('Izin notifikasi browser tidak diberikan.');

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: decodeVapidKey(publicKey),
            });
            const response = await fetch('/calendar/push-subscriptions', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify(subscription.toJSON()),
            });
            if (!response.ok) {
                await subscription.unsubscribe();
                throw new Error('Pendaftaran pengingat browser gagal disimpan.');
            }

            setActive(true);
            setMessage('Pengingat browser aktif. Anda akan diberi notifikasi 24 jam sebelum event terdaftar.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Pengaturan pengingat browser gagal.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-sm font-bold text-stone-900">Pengingat browser</h2>
                <p className="mt-1 text-xs leading-5 text-stone-500">Notifikasi dikirim 24 jam sebelum event yang Anda daftarkan. Browser perlu mengizinkan notifikasi.</p>
                {message && <p className="mt-2 text-xs text-stone-600" role="status">{message}</p>}
            </div>
            <button className="shrink-0 rounded-lg bg-[#3e5638] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#33472e] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !supported || (!enabled && !active)} onClick={toggle} type="button">
                {busy ? 'Menyimpan...' : active ? 'Nonaktifkan' : 'Aktifkan notifikasi'}
            </button>
        </section>
    );
}
