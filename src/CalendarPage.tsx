import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Info, RotateCcw, X } from 'lucide-react';
import './calendar.css';

type DayStatus = 'work' | 'leave' | 'holiday';
type SampleDay = { status: DayStatus; checkIn?: string; checkOut?: string; note?: string };

// Visual-design fixtures matching the October 2026 History preview.
// Never treat these examples as real attendance, leave approvals or public holidays.
const sampleDays: Record<number, SampleDay> = {};
const regularDays = [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 17, 19, 20, 22, 24, 26];
for (const day of regularDays) {
  sampleDays[day] = {
    status: 'work',
    checkIn: '08:30',
    checkOut: day === 26 ? '17:40' : '17:30',
  };
}
for (const day of [4, 11, 18]) {
  sampleDays[day] = { status: 'holiday', note: 'วันหยุด (ข้อมูลตัวอย่าง)' };
}
sampleDays[16] = { status: 'leave', note: 'วันลาที่ได้รับอนุมัติ (ข้อมูลตัวอย่าง)' };
sampleDays[21] = { status: 'work', checkIn: '08:30', checkOut: '20:00' };
sampleDays[23] = { status: 'work', checkIn: '08:30', checkOut: '20:00' };
sampleDays[25] = {
  status: 'work',
  checkIn: '08:00',
  checkOut: '16:00',
  note: 'ทำงานวันอาทิตย์ (ข้อมูลตัวอย่าง)',
};

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;
const statusLabels: Record<DayStatus, string> = {
  work: 'วันทำงาน',
  leave: 'วันลา',
  holiday: 'วันหยุด',
};
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
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const counts: Record<DayStatus, number> = { work: 0, leave: 0, holiday: 0 };
  if (isSampleMonth) {
    for (const entry of Object.values(sampleDays)) counts[entry.status] += 1;
  }

  const selectedDate = selectedDay === null ? null : new Date(Date.UTC(year, month, selectedDay));
  const selectedRecord = selectedDay !== null && isSampleMonth ? sampleDays[selectedDay] : undefined;
  const isSelectedFuture = selectedDay !== null
    && Date.UTC(year, month, selectedDay) > Date.UTC(today.year, today.month, today.day);

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
  const goToToday = (element: HTMLButtonElement) => {
    setMonthDate(new Date(Date.UTC(today.year, today.month, 1)));
    previousFocusRef.current = element;
    setSelectedDay(today.day);
  };

  return (
    <main className="calendar-page">
      <header className="calendar-heading">
        <span className="calendar-heading__icon" aria-hidden="true">
          <CalendarDays size={24} strokeWidth={1.9} />
        </span>
        <div className="calendar-heading__title">
          <h1 id="calendar-popup-title">ปฏิทินการทำงาน</h1>
          <p>ดูวันทำงาน วันหยุด และวันลา</p>
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
        <span>ข้อมูลสำหรับทดลองดีไซน์ · ยังไม่เชื่อมระบบจริง</span>
      </div>

      <section className="calendar-month-card" aria-label="ปฏิทินรายเดือน">
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
        <div className="calendar-grid" role="group" aria-label="เลือกวันที่เพื่อดูรายละเอียด">
          {cells.map((day, index) => {
            if (day === null) {
              return <span className="calendar-empty-cell" key={'empty-' + index} aria-hidden="true" />;
            }
            const date = new Date(Date.UTC(year, month, day));
            const isToday = today.year === year && today.month === month && today.day === day;
            const isFuture = date.getTime() > Date.UTC(today.year, today.month, today.day);
            const status = isSampleMonth && !isFuture ? sampleDays[day]?.status : undefined;
            const selected = selectedDay === day;
            const dayLabel = dateFormatter.format(date);
            const statusText = status ? ' · ' + statusLabels[status] + ' (ตัวอย่าง)' : '';
            return (
              <button
                key={day}
                type="button"
                className={'calendar-day'
                  + (status ? ' calendar-day--' + status : '')
                  + (isToday ? ' calendar-day--today' : '')
                  + (selected ? ' calendar-day--selected' : '')}
                aria-pressed={selected}
                aria-label={dayLabel + statusText}
                onClick={(event) => {
                  previousFocusRef.current = event.currentTarget;
                  setSelectedDay(day);
                }}
              >
                <span className="calendar-day__number">{day}</span>
                <span className={'calendar-day__marker' + (status ? ' calendar-day__marker--' + status : '')} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      <div className="calendar-legend" aria-label="คำอธิบายสถานะ">
        <span><i className="calendar-legend__dot calendar-legend__dot--work" />วันทำงาน</span>
        <span><i className="calendar-legend__dot calendar-legend__dot--leave" />วันลา</span>
        <span><i className="calendar-legend__dot calendar-legend__dot--holiday" />วันหยุด</span>
      </div>

      <section className="calendar-summary" aria-label="สรุปประจำเดือน">
        <h2>สรุปประจำเดือน <small>(ตัวอย่าง)</small></h2>
        <div className="calendar-summary__items">
          {(['work', 'leave', 'holiday'] as const).map((status) => (
            <div key={status}>
              <strong>{isSampleMonth ? counts[status] : '—'}</strong>
              <span>{statusLabels[status]}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="calendar-footer-note">รายการที่แสดงเป็นข้อมูลจำลอง ไม่ใช่บันทึกการทำงานหรือวันลาจริง</p>

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
                <span>รายละเอียดประจำวัน · ข้อมูลตัวอย่าง</span>
                <h2 id="calendar-day-popup-title">{dateFormatter.format(selectedDate)}</h2>
              </div>
              <button
                className="calendar-day-popup__close"
                ref={popupCloseRef}
                type="button"
                onClick={() => setSelectedDay(null)}
                aria-label="ปิดรายละเอียดวันที่เลือก"
              >
                <X size={21} aria-hidden="true" />
              </button>
            </div>

            {!isSelectedFuture && selectedRecord && (
              <div className={'calendar-day-popup__status calendar-day-popup__status--' + selectedRecord.status}>
                <span className="calendar-day-popup__status-dot" aria-hidden="true" />
                {statusLabels[selectedRecord.status]}
              </div>
            )}

            {isSelectedFuture ? (
              <p className="calendar-detail__empty">ยังไม่ถึงวันที่เลือก</p>
            ) : selectedRecord ? (
              <>
                {selectedRecord.checkIn && selectedRecord.checkOut && (
                  <div className="calendar-detail__times">
                    <div><span>เข้างาน</span><strong>{selectedRecord.checkIn}</strong></div>
                    <div><span>ออกงาน</span><strong>{selectedRecord.checkOut}</strong></div>
                  </div>
                )}
                {selectedRecord.note && <p className="calendar-detail__note">{selectedRecord.note}</p>}
              </>
            ) : (
              <p className="calendar-detail__empty">ยังไม่มีข้อมูลตัวอย่างสำหรับวันที่เลือก</p>
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
