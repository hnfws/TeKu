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

const formatTime = (date: string) => date.split(' ')[1]?.slice(0, 5) ?? '';

export default function EventCalendar({ month, events, pushPublicKey, pushEnabled }: EventCalendarProps) {
    const [year, monthNumber] = month.split('-').map(Number);
    const today = new Date();
    const todayKey = dateKey(today);
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
    const weeks = Array.from({ length: weekCount }, (_, index) => days.slice(index * 7, index * 7 + 7));
    return (
        <ManagementLayout title="Event Calendar">
            <div className="mx-auto max-w-[1120px] space-y-5">
                <header className="flex items-center gap-3">
                    <Link aria-label="Kembali ke dashboard" className="rounded-full p-2 text-stone-700 hover:bg-white" href="/dashboard">
                        <i className="fa-solid fa-arrow-left text-lg" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Event Calendar</h1>
                        <p className="mt-1 text-sm text-stone-500">Jadwal event yang tersedia di aplikasi</p>
                    </div>
                </header>

                <section
                    aria-label={`Kalender event ${monthName(month)}`}
                    className="overflow-hidden rounded-2xl border border-[#5065bb] bg-white shadow-sm"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-4 sm:px-6">
                        <h2 className="text-lg font-bold text-[#293d75]">{monthName(month)}</h2>
                        <div className="flex items-center gap-2">
                            <Link className="rounded-md bg-stone-500 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-600" href="/calendar">
                                Hari ini
                            </Link>
                            <div className="flex overflow-hidden rounded-md bg-slate-800">
                                <Link
                                    aria-label="Bulan sebelumnya"
                                    className="px-3 py-2 text-white hover:bg-slate-700"
                                    href={`/calendar?month=${shiftMonth(month, -1)}`}
                                >
                                    <i className="fa-solid fa-chevron-left" />
                                </Link>
                                <Link
                                    aria-label="Bulan berikutnya"
                                    className="px-3 py-2 text-white hover:bg-slate-700"
                                    href={`/calendar?month=${shiftMonth(month, 1)}`}
                                >
                                    <i className="fa-solid fa-chevron-right" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[760px]">
                            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-semibold text-[#293d75]">
                                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((weekday) => (
                                    <div className="px-2 py-2.5" key={weekday}>
                                        {weekday}
                                    </div>
                                ))}
                            </div>
                            <div>
                                {weeks.map((week) => {
                                    const weekStart = week[0];
                                    const weekEnd = week[6];
                                    const segments = events
                                        .flatMap((event) => {
                                            const [startYear, startMonth, startDay] = event.start_date.slice(0, 10).split('-').map(Number);
                                            const [endYear, endMonth, endDay] = event.end_date.slice(0, 10).split('-').map(Number);
                                            const eventStart = new Date(startYear, startMonth - 1, startDay);
                                            const eventEnd = new Date(endYear, endMonth - 1, endDay);
                                            if (eventEnd < weekStart || eventStart > weekEnd) return [];

                                            return [
                                                {
                                                    event,
                                                    start: Math.max(0, Math.round((eventStart.getTime() - weekStart.getTime()) / 86_400_000)),
                                                    end: Math.min(6, Math.round((eventEnd.getTime() - weekStart.getTime()) / 86_400_000)),
                                                },
                                            ];
                                        })
                                        .sort((left, right) => left.start - right.start || right.end - left.end);
                                    const lanes: number[] = [];
                                    const visibleSegments = segments.flatMap((segment) => {
                                        const availableLane = lanes.findIndex((end) => end < segment.start);
                                        const lane = availableLane === -1 ? lanes.length : availableLane;
                                        if (lane >= 3) return [];
                                        lanes[lane] = segment.end;
                                        return [{ ...segment, lane }];
                                    });
                                    const hiddenSegments = segments.length - visibleSegments.length;

                                    return (
                                        <div className="relative grid min-h-[132px] grid-cols-7" key={dateKey(weekStart)}>
                                            {week.map((day) => {
                                                const key = dateKey(day);
                                                const currentMonth = day.getMonth() === monthNumber - 1;

                                                return (
                                                    <div
                                                        className={`border-r border-b border-stone-200 p-1.5 sm:p-2 ${currentMonth ? 'bg-white' : 'bg-stone-50/80'}`}
                                                        key={key}
                                                    >
                                                        <span
                                                            className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs ${key === todayKey ? 'bg-blue-600 font-bold text-white' : currentMonth ? 'text-[#293d75]' : 'text-stone-300'}`}
                                                        >
                                                            {day.getDate()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {visibleSegments.map(({ event, start, end, lane }) => (
                                                <Link
                                                    className={`absolute z-10 h-[19px] truncate px-1.5 text-[10px] leading-[19px] ${start > 0 ? 'rounded-l-none' : 'rounded-l-sm'} ${end < 6 ? 'rounded-r-none' : 'rounded-r-sm'} ${event.is_registered ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-400 text-slate-800 hover:bg-amber-500'}`}
                                                    href={`/events/${event.id}`}
                                                    key={`${dateKey(weekStart)}-${event.id}`}
                                                    style={{
                                                        left: `${(start / 7) * 100}%`,
                                                        top: `${34 + lane * 23}px`,
                                                        width: `${((end - start + 1) / 7) * 100}%`,
                                                    }}
                                                    title={event.title}
                                                >
                                                    {event.start_date.slice(0, 10) === dateKey(week[start]) && formatTime(event.start_date)
                                                        ? `${formatTime(event.start_date)} `
                                                        : ''}
                                                    {event.title}
                                                </Link>
                                            ))}
                                            {hiddenSegments > 0 && (
                                                <span
                                                    className="absolute z-10 truncate px-1 text-[10px] leading-4 text-stone-700"
                                                    style={{ left: `${(visibleSegments.at(-1)?.start ?? 0) * (100 / 7)}%`, top: '105px' }}
                                                >
                                                    +{hiddenSegments} lainnya
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>
                <BrowserReminders enabled={pushEnabled} publicKey={pushPublicKey} />
                <section className="rounded-xl border border-stone-200 bg-white p-4">
                    <h2 className="text-sm font-bold text-stone-900">Pengingat email</h2>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                        Email pengingat dikirim ke alamat akun Anda 24 jam sebelum jadwal tenant yang sudah ditandai terdaftar.
                    </p>
                </section>
            </div>
        </ManagementLayout>
    );
}
