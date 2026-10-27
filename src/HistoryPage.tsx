import { useEffect, useRef, useState } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Timer,
  X,
} from 'lucide-react';
import './history.css';

type DayStatus = 'work' | 'ot' | 'leave' | 'holiday';
type DayEntry = {
  status: DayStatus;
  checkIn?: string;
  checkOut?: string;
  minutes?: number;
  note?: string;
};

const statusLabels: Record<DayStatus, string> = {
  work: 'ทำงานครบ',
  ot: 'มี OT',
  leave: 'ลางาน',
  holiday: 'วันหยุด',
};

// Visual-design examples only. These are NOT Firestore attendance records.
const sampleEntries: Record<number, DayEntry> = {};
const regularDays = [1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 17, 19, 20, 22, 24, 26];
for (const day of regularDays) {
  sampleEntries[day] = {
    status: 'work',
    checkIn: '08:30',
    checkOut: day === 26 ? '17:40' : '17:30',
    minutes: day === 26 ? 550 : 540,
  };
}
for (const day of [4, 11, 18]) {
  sampleEntries[day] = { status: 'holiday', note: 'วันหยุด (ตัวอย่าง)' };
}
sampleEntries[16] = { status: 'leave', note: 'วันลาที่ได้รับอนุมัติ (ตัวอย่าง)' };
sampleEntries[21] = { status: 'work', checkIn: '08:30', checkOut: '20:00', minutes: 690 };
sampleEntries[23] = { status: 'work', checkIn: '08:30', checkOut: '20:00', minutes: 690 };
sampleEntries[25] = {
  status: 'work',
  checkIn: '08:00',
  checkOut: '16:00',
  minutes: 480,
  note: 'ทำงานในวันหยุด (ตัวอย่าง) · ไม่มี OT เพราะออกงานก่อน 19:00 น.',
};

const weekdays = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

const thaiMonth = new Intl.DateTimeFormat('th-TH', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const thaiFullDate = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function todayInBangkok() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => Number(parts.find((item) => item.type === name)?.value ?? 0);
  return { year: part('year'), month: part('month') - 1, day: part('day') };
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain ? hours + ' ชม. ' + remain + ' นาที' : hours + ' ชม.';
}

// Trial overtime rule: count work done strictly after 19:00.
// A check-out earlier than check-in is on the following day.
function calculateOvertimeMinutes(entry: DayEntry): number {
  if (!entry.checkIn || !entry.checkOut) return 0;
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const start = toMinutes(entry.checkIn);
  let end = toMinutes(entry.checkOut);
  if (end < start) end += 24 * 60;
  return Math.max(0, end - Math.max(start, 19 * 60));
}

function displayStatus(entry: DayEntry): DayStatus {
  return entry.status === 'work' && calculateOvertimeMinutes(entry) > 0
    ? 'ot'
    : entry.status;
}

function HistoryPage() {
  const [monthDate, setMonthDate] = useState(() => {
    const today = todayInBangkok();
    return new Date(Date.UTC(today.year, today.month, 1));
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const isSampleMonth = year === 2026 && month === 9;
  const entries = isSampleMonth ? sampleEntries : {};
  const today = todayInBangkok();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const calendarCells = Array.from(
    { length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 },
    (_, index) => index - firstWeekday + 1,
  );
  const allEntries = Object.values(entries) as DayEntry[];
  const workedDays = allEntries.filter((entry) => entry.status === 'work' || entry.status === 'ot').length;
  const totalMinutes = allEntries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
  const overtimeMinutes = allEntries.reduce((sum, entry) => sum + calculateOvertimeMinutes(entry), 0);
  const selectedEntry = selectedDay === null ? undefined : (entries as Record<number, DayEntry>)[selectedDay];
  const selectedStatus = selectedEntry ? displayStatus(selectedEntry) : 'empty';

  useEffect(() => {
    if (selectedDay === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedDay(null);
    };
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [selectedDay]);

  const changeMonth = (offset: number) => {
    setSelectedDay(null);
    setMonthDate(new Date(Date.UTC(year, month + offset, 1)));
  };

  const openDay = (day: number, element: HTMLButtonElement) => {
    previousFocusRef.current = element;
    setSelectedDay(day);
  };

  return (
    <main className="history-page">
      <header className="history-heading">
        <span className="history-heading__icon" aria-hidden="true">
          <CalendarDays size={24} strokeWidth={1.9} />
        </span>
        <div>
          <h1>ประวัติการทำงาน</h1>
          <p>ตรวจสอบเวลาทำงานย้อนหลัง</p>
        </div>
      </header>

      <div className="history-demo-notice" role="status">
        <Info size={17} aria-hidden="true" />
        <span>ข้อมูลตัวอย่างเพื่อทดลองดีไซน์ ยังไม่เชื่อม Firebase</span>
      </div>

      <div className="history-month-select" aria-label="เลือกเดือนที่ต้องการดู">
        <button type="button" onClick={() => changeMonth(-1)} aria-label="เดือนก่อนหน้า">
          <ChevronLeft size={22} />
        </button>
        <strong aria-live="polite">{thaiMonth.format(monthDate)}</strong>
        <button type="button" onClick={() => changeMonth(1)} aria-label="เดือนถัดไป">
          <ChevronRight size={22} />
        </button>
      </div>

      <section className="history-summary" aria-label="สรุปการทำงานของเดือน (ข้อมูลตัวอย่าง)">
        <div className="history-summary__item">
          <CalendarCheck2 size={20} aria-hidden="true" />
          <strong>{isSampleMonth ? workedDays : '–'}</strong>
          <span>วันทำงาน</span>
        </div>
        <div className="history-summary__item">
          <Clock3 size={20} aria-hidden="true" />
          <strong>{isSampleMonth ? formatDuration(totalMinutes) : '–'}</strong>
          <span>ชั่วโมงรวม</span>
        </div>
        <div className="history-summary__item">
          <Timer size={20} aria-hidden="true" />
          <strong>{isSampleMonth ? formatDuration(overtimeMinutes) : '–'}</strong>
          <span>ชั่วโมง OT</span>
        </div>
      </section>

      <section className="history-calendar" aria-label="ปฏิทินการทำงาน">
        <div className="history-calendar__grid">
          {weekdays.map((weekday) => (
            <div className="history-calendar__weekday" key={weekday}>{weekday}</div>
          ))}
          {calendarCells.map((day, index) => {
            if (day < 1 || day > daysInMonth) {
              return <div key={'blank-' + index} className="history-calendar__blank" aria-hidden="true" />;
            }
            const record = (entries as Record<number, DayEntry>)[day];
            const isToday = year === today.year && month === today.month && day === today.day;
            const isFuture = new Date(Date.UTC(year, month, day)).getTime()
              > new Date(Date.UTC(today.year, today.month, today.day)).getTime();
            return (
              <button
                key={day}
                type="button"
                className={'history-calendar__day'
                  + (record ? ' history-calendar__day--' + displayStatus(record) : '')
                  + (isToday ? ' history-calendar__day--today' : '')
                  + (isFuture ? ' history-calendar__day--future' : '')}
                aria-label={String(day) + ' ' + thaiMonth.format(monthDate)
                  + (record ? ' — ' + statusLabels[displayStatus(record)] + ' (ตัวอย่าง)' : ' — ไม่มีข้อมูลตัวอย่าง')}
                onClick={(event) => openDay(day, event.currentTarget)}
              >
                <span>{day}</span>
                <span className="history-calendar__dot" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className="history-legend" aria-label="ความหมายจุดสี">
          <span><i className="history-legend__dot history-legend__dot--work" />ทำงาน</span>
          <span><i className="history-legend__dot history-legend__dot--ot" />มี OT</span>
          <span><i className="history-legend__dot history-legend__dot--leave" />ลา</span>
          <span><i className="history-legend__dot history-legend__dot--holiday" />วันหยุด</span>
        </div>
      </section>

      <p className="history-tap-hint">แตะวันที่เพื่อดูรายละเอียด · OT เริ่มหลัง 19:00 น.</p>
      {!isSampleMonth && (
        <div className="history-empty-month">
          <CalendarDays size={22} aria-hidden="true" />
          <p>ยังไม่มีข้อมูลตัวอย่างสำหรับเดือนนี้</p>
          <span>ลองกลับไปดูเดือนตุลาคม 2569 เพื่อทดสอบหน้าประวัติ</span>
        </div>
      )}
      <p className="history-footer-note">หมายเหตุ: จุดสีและตัวเลขทั้งหมดเป็นข้อมูลจำลอง ไม่ใช่ประวัติลงเวลาจริง</p>

      {selectedDay !== null && (
        <div
          className="history-popup-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedDay(null);
          }}
        >
          <section
            className="history-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-popup-title"
            aria-describedby="history-popup-description"
          >
            <div className="history-popup__handle" aria-hidden="true" />
            <div className="history-popup__heading">
              <div>
                <h2 id="history-popup-title">
                  {thaiFullDate.format(new Date(Date.UTC(year, month, selectedDay)))}
                </h2>
                <p id="history-popup-description">รายละเอียดประจำวัน · ข้อมูลตัวอย่าง</p>
              </div>
              <button
                className="history-popup__close"
                type="button"
                ref={closeButtonRef}
                aria-label="ปิดรายละเอียด"
                onClick={() => setSelectedDay(null)}
              >
                <X size={21} />
              </button>
            </div>

            <div className={'history-popup__status history-popup__status--' + selectedStatus}>
              <span className="history-popup__status-dot" aria-hidden="true" />
              {selectedEntry ? statusLabels[displayStatus(selectedEntry)] : 'ไม่มีข้อมูลตัวอย่าง'}
            </div>

            {selectedEntry?.checkIn && selectedEntry.checkOut ? (
              <>
                <div className="history-popup__times">
                  <div>
                    <span>เวลาเข้างาน</span>
                    <strong>{selectedEntry.checkIn}</strong>
                  </div>
                  <div>
                    <span>เวลาออกงาน</span>
                    <strong>{selectedEntry.checkOut}</strong>
                  </div>
                </div>
                <div className="history-popup__line">
                  <span>ชั่วโมงทำงานรวม</span>
                  <strong>{formatDuration(selectedEntry.minutes ?? 0)}</strong>
                </div>
                <div className="history-popup__line">
                  <span>ชั่วโมง OT</span>
                  <strong>{formatDuration(calculateOvertimeMinutes(selectedEntry))}</strong>
                </div>
                {selectedEntry.note && <p className="history-popup__note">{selectedEntry.note}</p>}
              </>
            ) : (
              <p className="history-popup__empty">
                {selectedEntry?.note
                  ?? 'ยังไม่มีรายการเวลาเข้างานหรือออกงานในข้อมูลตัวอย่างของวันนี้'}
              </p>
            )}
            <button className="history-popup__done" type="button" onClick={() => setSelectedDay(null)}>
              ปิดรายละเอียด
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default HistoryPage;
