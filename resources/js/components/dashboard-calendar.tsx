import { Link } from '@inertiajs/react';

type CalendarEvent = {
    id: number;
    title: string;
    start_date: string | null;
};

interface DashboardCalendarProps {
    events: CalendarEvent[];
}

export default function DashboardCalendar({ events }: DashboardCalendarProps) {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstWeekday = monthStart.getDay();
    const days = [
        ...Array.from({ length: firstWeekday }, (_, index) => `blank-${index}` as const),
        ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
    const registeredEventsByDay = new Map<number, CalendarEvent[]>();

    events.forEach((event) => {
        if (!event.start_date) return;

        const [year, month, day] = event.start_date.split('-').map(Number);
        if (year !== today.getFullYear() || month !== today.getMonth() + 1) return;

        const matchingEvents = registeredEventsByDay.get(day) ?? [];
        matchingEvents.push(event);
        registeredEventsByDay.set(day, matchingEvents);
    });

    return (
        <section aria-label="Kalender jadwal event" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <Link
                aria-label="Buka kalender event"
                className="flex items-center justify-between rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#688463]"
                href="/calendar"
            >
                <div>
                    <h2 className="font-bold text-gray-900">Kalender</h2>
                    <p className="mt-1 text-xs text-gray-500">{today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                </div>
                <i aria-hidden="true" className="fa-regular fa-calendar text-xl text-[#688463]" />
            </Link>
            <div className="mt-5 grid grid-cols-7 gap-y-2 text-center text-xs">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((weekday) => (
                    <span className="py-1 font-medium text-gray-400" key={weekday}>
                        {weekday}
                    </span>
                ))}
                {days.map((day) => {
                    if (typeof day !== 'number') return <span aria-hidden="true" key={day} />;

                    const markedEvents = registeredEventsByDay.get(day) ?? [];
                    const isToday = day === today.getDate();

                    return (
                        <span
                            aria-label={markedEvents.length ? `${day}, ${markedEvents.map((event) => event.title).join(', ')}` : undefined}
                            className="flex min-h-8 flex-col items-center justify-center"
                            key={day}
                        >
                            <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full ${isToday ? 'bg-[#3b66f5] font-bold text-white' : 'text-gray-700'}`}
                            >
                                {day}
                            </span>
                            {markedEvents.length > 0 && <span aria-hidden="true" className="mt-0.5 h-1 w-1 rounded-full bg-indigo-500" />}
                        </span>
                    );
                })}
            </div>
        </section>
    );
}
