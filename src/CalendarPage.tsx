import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  MapPin,
  RotateCcw,
  X,
} from 'lucide-react';
import './calendar.css';

type WorkEvent = {
  id: string;
  title: string;
  time: string;
  location?: string;
  note?: string;
};

// Design preview only: no Firestore job assignments or real schedules yet.
// Unlike History, Calendar never displays attendance, leave or work-hour totals.
const sampleSchedules: Record<number, WorkEvent[]> = {
  21: [
    { id: 'demo-21', title: 'ประชุมวางแผนงาน', time: '09:00 – 10:00', location: 'ห้องประชุม (ตัวอย่าง)' },
  ],
  23: [
    { id: 'demo-23', title: 'ตรวจสอบหน้างาน', time: '09:30 – 12:00', location: 'สถานที่ปฏิบัติงาน (ตัวอย่าง)' },
  ],
  28: [
    { id: 'demo-28', title: 'ประชุมติดตามความคืบหน้า', time: '13:00 – 14:00', location: 'ห้องประชุม (ตัวอย่าง)' },
  ],
  29: [
    { id: 'demo-29-1', title: 'ตรวจความพร้อมอุปกรณ์', time: '09:00 – 11:00', location: 'พื้นที่ปฏิบัติงาน (ตัวอย่าง)' },
    { id: 'demo-29-2', title: 'ประสานงานโครงการ', time: '14:00 – 15:00', note: 'ตรวจสอบรายละเอียดงานที่ได้รับมอบหมาย (ตัวอย่าง)' },
  ],
  30: [
    { id: 'demo-30', title: 'ตรวจสอบงานประจำวัน', time: '08:30 – 12:00', location: 'หน้างาน (ตัวอย่าง)' },
  ],
  31: [
    { id: 'demo-31', title: 'สรุปงานประจำสัปดาห์', time: '10:00 – 11:00', location: 'สำนักงาน (ตัวอย่าง)' },
  ],
};

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;
const monthFormatter = new Intl.DateTimeFormat('th-TH', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
});
const dateFormatter = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
function bangkokParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (key: string) => Number(parts.find((item) => item.type === key)?.value ?? 0);
  return { year: part('year'), month: part('month') - 1, day: part('day') };
}

export default function CalendarPage({ now, onClose }: { now: Date; onClose: () => void }) {
  const today = bangkokParts(now);
  const [monthDate, setMonthDate] = useState(() => new Date(Date.UTC(today.year, today.month, 1)));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const popupCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLElement>(null);

  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const isSampleMonth = year === 2026 && month === 9;
  const schedules = isSampleMonth ? sampleSchedules : {};
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDate = selectedDay === null ? null : new Date(Date.UTC(year, month, selectedDay));
  const selectedEvents = selectedDay === null ? [] : (schedules[selectedDay] ?? []);
  const agenda = Object.entries(schedules)
    .flatMap(([day, events]) => events.map((event) => ({ day: Number(day), event })))
    .sort((a, b) => a.day - b.day || a.event.time.localeCompare(b.event.time));
  const previewAgenda = agenda
    .filter(({ day }) => year > today.year
      || (year === today.year && (month > today.month || (month === today.month && day >= today.day))))
    .slice(0, 3);

  useEffect(() => {
    if (selectedDay === null) return;
    const popup = popupRef.current;
    popupCloseRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedDay(null);
      }
      if (event.key !== 'Tab' || !popup) return;
      const buttons = Array.from(popup.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if (!buttons.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [selectedDay]);

  const changeMonth = (offset: number) => {
    setMonthDate(new Date(Date.UTC(year, month + offset, 1)));
    setSelectedDay(null);
  };
  const openDay = (day: number, button: HTMLButtonElement) => {
    previousFocusRef.current = button;
    setSelectedDay(day);
  };
  const goToToday = (button: HTMLButtonElement) => {
    setMonthDate(new Date(Date.UTC(today.year, today.month, 1)));
    openDay(today.day, button);
  };

  return (
    <main className="calendar-page">
      <header className="calendar-heading">
        <span className="calendar-heading__icon" aria-hidden="true">
          <CalendarDays size={24} strokeWidth={1.9} />
        </span>
        <div className="calendar-heading__title">
          <h1 id="calendar-popup-title">ปฏิทินกำหนดการงาน</h1>
          <p>ดูงานและนัดหมายที่ได้รับมอบหมาย</p>
        </div>
        <button className="calendar-today" type="button" onClick={(event) => goToToday(event.currentTarget)} aria-label="กลับไปวันที่วันนี้">
          <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
          วันนี้
        </button>
        <button className="calendar-close" type="button" onClick={onClose} aria-label="ปิดปฏิทิน">
          <X size={23} aria-hidden="true" />
        </button>
      </header>

      <div className="calendar-demo-notice" role="status">
        <Info size={17} aria-hidden="true" />
        <span>กำหนดการตัวอย่าง · ยังไม่เชื่อมข้อมูลงานจริง</span>
      </div>

      <section className="calendar-month-card" aria-label="ปฏิทินกำหนดการรายเดือน">
        <div className="calendar-month-nav">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="เดือนก่อนหน้า">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <strong aria-live="polite">{monthFormatter.format(monthDate)}</strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="เดือนถัดไป">
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="calendar-grid" role="group" aria-label="เลือกวันที่เพื่อดูกำหนดการ">
          {cells.map((day, index) => {
            if (day === null) {
              return <span className="calendar-empty-cell" key={'empty-' + index} aria-hidden="true" />;
            }
            const date = new Date(Date.UTC(year, month, day));
            const isToday = today.year === year && today.month === month && today.day === day;
            const events = schedules[day] ?? [];
            const hasSchedule = events.length > 0;
            const selected = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                className={'calendar-day'
                  + (hasSchedule ? ' calendar-day--scheduled' : '')
                  + (isToday ? ' calendar-day--today' : '')
                  + (selected ? ' calendar-day--selected' : '')}
                aria-pressed={selected}
                aria-label={dateFormatter.format(date) + (hasSchedule ? ' · มีกำหนดการ ' + events.length + ' รายการ (ตัวอย่าง)' : ' · ไม่มีกำหนดการตัวอย่าง')}
                onClick={(event) => openDay(day, event.currentTarget)}
              >
                <span className="calendar-day__number">{day}</span>
                <span className={'calendar-day__marker' + (hasSchedule ? ' calendar-day__marker--scheduled' : '')} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      <div className="calendar-legend" aria-label="คำอธิบายปฏิทิน">
        <span><i className="calendar-legend__dot calendar-legend__dot--scheduled" />มีกำหนดการงาน</span>
        <span><i className="calendar-legend__today" />วันนี้</span>
      </div>

      <section className="calendar-agenda" aria-label="กำหนดการที่กำลังจะถึง">
        <h2>กำหนดการที่กำลังจะถึง <small>(ตัวอย่าง)</small></h2>
        {previewAgenda.length > 0 ? (
          <div className="calendar-agenda__list">
            {previewAgenda.map(({ day, event }) => (
              <div className="calendar-agenda__item" key={event.id}>
                <span className="calendar-agenda__date">
                  <strong>{String(day).padStart(2, '0')}</strong>
                  <small>{month + 1}/{year + 543}</small>
                </span>
                <div className="calendar-agenda__content">
                  <strong>{event.title}</strong>
                  <span><Clock3 size={14} aria-hidden="true" />{event.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="calendar-agenda__empty">ไม่มีกำหนดการตัวอย่างที่กำลังจะถึงในเดือนนี้</div>
        )}
      </section>

      <p className="calendar-footer-note">งานและเวลาทั้งหมดเป็นข้อมูลตัวอย่าง ไม่ใช่กำหนดการมอบหมายงานจริง</p>

      {selectedDay !== null && selectedDate && createPortal(
        <div
          className="calendar-day-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedDay(null);
          }}
        >
          <section
            className="calendar-day-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-day-popup-title"
            ref={popupRef}
          >
            <div className="calendar-day-popup__handle" aria-hidden="true" />
            <div className="calendar-day-popup__heading">
              <div>
                <span>กำหนดการประจำวัน · ข้อมูลตัวอย่าง</span>
                <h2 id="calendar-day-popup-title">{dateFormatter.format(selectedDate)}</h2>
              </div>
              <button
                className="calendar-day-popup__close"
                ref={popupCloseRef}
                type="button"
                onClick={() => setSelectedDay(null)}
                aria-label="ปิดรายละเอียดกำหนดการ"
              >
                <X size={21} aria-hidden="true" />
              </button>
            </div>

            {selectedEvents.length > 0 ? (
              <div className="calendar-event-list">
                {selectedEvents.map((event) => (
                  <article className="calendar-event" key={event.id}>
                    <div className="calendar-event__heading">
                      <span className="calendar-event__indicator" aria-hidden="true" />
                      <strong>{event.title}</strong>
                    </div>
                    <div className="calendar-event__meta">
                      <span><Clock3 size={16} aria-hidden="true" />{event.time}</span>
                      {event.location && <span><MapPin size={16} aria-hidden="true" />{event.location}</span>}
                    </div>
                    {event.note && <p className="calendar-event__note">{event.note}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <p className="calendar-detail__empty">ไม่มีกำหนดการงานตัวอย่างสำหรับวันนี้</p>
            )}

            <button className="calendar-day-popup__done" type="button" onClick={() => setSelectedDay(null)}>
              ปิดรายละเอียด
            </button>
          </section>
        </div>,
        document.querySelector('.app-shell') ?? document.body,
      )}
    </main>
  );
}
