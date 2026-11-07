import { Link } from '@inertiajs/react';

import BrowserReminders from '@/components/browser-reminders';
import ManagementLayout from '@/layouts/management-layout';

type CalendarEvent = {
    id: number;
    title: string;
    location_name: string;
    start_date: string;
    end_date: string;
    is_registered: boolean;
};

interface EventCalendarProps {
    month: string;
    events: CalendarEvent[];
    pushPublicKey: string | null;
    pushEnabled: boolean;
}

const monthName = (month: string) => {
    const [year, value] = month.split('-').map(Number);
    return new Date(year, value - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const shiftMonth = (month: string, offset: number) => {
    const [year, value] = month.split('-').map(Number);
    const date = new Date(year, value - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatTime = (date: string) => {
    const [, time] = date.split(' ');
    return time?.slice(0, 5) ?? '';
};

export default function EventCalendar({ month, events, pushPublicKey, pushEnabled }: EventCalendarProps) {
    const [year, monthNumber] = month.split('-').map(Number);
    const monthStart = new Date(year, monthNumber - 1, 1);
    const startOffset = monthStart.getDay();
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const gridStart = new Date(year, monthNumber - 1, 1 - startOffset);
    const weekCount = Math.ceil((startOffset + daysInMonth) / 7);
    const days = Array.from({ length: weekCount * 7 }, (_, index) => {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        return day;
    });
    const todayKey = dateKey(new Date());
    const eventsByDay = new Map<string, CalendarEvent[]>();

    events.forEach((event) => {
        const [startYear, startMonth, startDay] = event.start_date.slice(0, 10).split('-').map(Number);
        const [endYear, endMonth, endDay] = event.end_date.slice(0, 10).split('-').map(Number);
        const eventStart = new Date(startYear, startMonth - 1, startDay);
        const eventEnd = new Date(endYear, endMonth - 1, endDay);

        for (const day = new Date(eventStart); day <= eventEnd; day.setDate(day.getDate() + 1)) {
            const key = dateKey(day);
            const items = eventsByDay.get(key) ?? [];
            items.push(event);
            eventsByDay.set(key, items);
        }
    });

    return (
        <ManagementLayout title="Event Calendar">
            <div className="mx-auto max-w-[1120px] space-y-5">
                <header className="flex items-center gap-3">
                    <Link aria-label="Kembali ke dashboard" className="rounded-full p-2 text-stone-700 hover:bg-white" href="/dashboard"><i className="fa-solid fa-arrow-left text-lg" /></Link>
                    <div><h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Event Calendar</h1><p className="mt-1 text-sm text-stone-500">Event dari database aplikasi dan pengingat pendaftaran Anda</p></div>
                </header>

                <section aria-label={`Kalender event ${monthName(month)}`} className="overflow-hidden rounded-2xl border border-[#5065bb] bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 sm:px-6">
                        <h2 className="text-lg font-bold text-[#293d75]">{monthName(month)}</h2>
                        <div className="flex items-center gap-2">
                            <Link className="rounded-md bg-stone-500 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-600" href="/calendar">Hari ini</Link>
                            <div className="flex overflow-hidden rounded-md bg-slate-800">
                                <Link aria-label="Bulan sebelumnya" className="px-3 py-2 text-white hover:bg-slate-700" href={`/calendar?month=${shiftMonth(month, -1)}`}><i className="fa-solid fa-chevron-left" /></Link>
                                <Link aria-label="Bulan berikutnya" className="px-3 py-2 text-white hover:bg-slate-700" href={`/calendar?month=${shiftMonth(month, 1)}`}><i className="fa-solid fa-chevron-right" /></Link>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[760px]">
                            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-semibold text-[#293d75]">
                                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((weekday) => <div className="px-2 py-2.5" key={weekday}>{weekday}</div>)}
                            </div>
                            <div className="grid grid-cols-7">
                                {days.map((day) => {
                                    const key = dateKey(day);
                                    const currentMonth = day.getMonth() === monthNumber - 1;
                                    const dayEvents = eventsByDay.get(key) ?? [];
                                    return (
                                        <div className={`min-h-[118px] border-b border-r border-stone-200 p-1.5 sm:min-h-[132px] sm:p-2 ${currentMonth ? 'bg-white' : 'bg-stone-50/80'}`} key={key}>
                                            <span className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs ${key === todayKey ? 'bg-blue-600 font-bold text-white' : currentMonth ? 'text-[#293d75]' : 'text-stone-300'}`}>{day.getDate()}</span>
                                            <div className="mt-1 space-y-1">
                                                {dayEvents.slice(0, 3).map((event) => (
                                                    <Link className={`block truncate rounded-sm px-1.5 py-1 text-[10px] leading-4 ${event.is_registered ? 'bg-emerald-600 font-semibold text-white hover:bg-emerald-700' : 'bg-amber-400 text-slate-800 hover:bg-amber-500'}`} href={`/events/${event.id}`} key={`${key}-${event.id}`} title={`${event.title}${event.is_registered ? ' · Terdaftar' : ''}`}>
                                                        {event.start_date.slice(0, 10) === key && formatTime(event.start_date) ? `${formatTime(event.start_date)} ` : ''}{event.title}
                                                    </Link>
                                                ))}
                                                {dayEvents.length > 3 && <p className="px-1 text-[10px] text-stone-600">+{dayEvents.length - 3} lainnya</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 border-t border-stone-100 px-4 py-3 text-xs text-stone-600 sm:px-6">
                        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Event</span>
                        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />Event terdaftar · pengingat aktif</span>
                    </div>
                </section>

                <BrowserReminders enabled={pushEnabled} publicKey={pushPublicKey} />
                <section className="rounded-xl border border-stone-200 bg-white p-4">
                    <h2 className="text-sm font-bold text-stone-900">Pengingat email</h2>
                    <p className="mt-1 text-xs leading-5 text-stone-500">Email pengingat dikirim ke alamat akun Anda 24 jam sebelum event terdaftar. Pengiriman aktif setelah server mengatur layanan email (SMTP).</p>
                </section>
            </div>
        </ManagementLayout>
    );
}
