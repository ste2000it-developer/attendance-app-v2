import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Info,
  History,
  X,
} from 'lucide-react';
import './history.css';
import { bangkokInstant, fillEmptyPunch, type AttendanceRecord } from './domain/attendanceRules';

type DayStatus = 'work' | 'leave' | 'holiday';
type DayEntry = {
  status: DayStatus;
  checkIn?: string;
  checkOut?: string;
  minutes?: number;
  note?: string;
  manual?: boolean;
};

const statusLabels: Record<DayStatus, string> = {
  work: 'ทำงานครบ',
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
  note: 'ทำงานวันอาทิตย์ (ตัวอย่าง)',
};

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

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

function formatPunchDuration(minutes: number) {
  return Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0');
}

function HistoryPage({ onBack }: { onBack: () => void }) {
  const [monthDate, setMonthDate] = useState(() => {
    const today = todayInBangkok();
    return new Date(Date.UTC(today.year, today.month, 1));
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [manualTimes, setManualTimes] = useState<Record<string, { checkIn?: string; checkOut?: string; outNextDay?: boolean }>>({});
  const [editing, setEditing] = useState<'checkIn' | 'checkOut' | null>(null);
  const [editTime, setEditTime] = useState('');
  const [outNextDay, setOutNextDay] = useState(false);
  const [editError, setEditError] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const isSampleMonth = year === 2026 && month === 9;
  const monthPrefix = year + '-' + String(month + 1).padStart(2, '0') + '-';
  const entries: Record<number, DayEntry> = isSampleMonth ? { ...sampleEntries } : {};
  for (const [date, values] of Object.entries(manualTimes)) {
    if (!date.startsWith(monthPrefix)) continue;
    const day = Number(date.slice(-2));
    entries[day] = { ...entries[day], status: 'work', checkIn: values.checkIn ?? entries[day]?.checkIn,
      checkOut: values.checkOut ?? entries[day]?.checkOut, manual: true,
      note: 'เวลาที่กรอกย้อนหลัง (ตัวอย่าง) · รอ HR ตรวจสอบ' };
  }
  const today = todayInBangkok();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const allEntries = Object.values(entries) as DayEntry[];
  const workedDays = allEntries.filter((entry) => entry.status === 'work').length;
  const totalMinutes = allEntries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
  const selectedEntry = selectedDay === null ? undefined : (entries as Record<number, DayEntry>)[selectedDay];
  const selectedStatus = selectedEntry?.status ?? 'empty';
  const selectedISO = selectedDay === null ? '' : monthPrefix + String(selectedDay).padStart(2, '0');
  const todayISO = today.year + '-' + String(today.month + 1).padStart(2, '0') + '-' + String(today.day).padStart(2, '0');
  const canEditSelected = Boolean(selectedISO && selectedISO <= todayISO);
  const saveManualTime = () => {
    if (!selectedDay || !editing || !editTime || !canEditSelected) return;
    const row = selectedEntry;
    if (row?.[editing]) { setEditError('ช่องเวลานี้มีข้อมูลแล้ว ไม่สามารถแก้ไขได้'); return; }
    try {
      const date = selectedISO;
      const record: AttendanceRecord = {
        id: 'preview-' + date, employeeId: 'preview', date,
        checkIn: row?.checkIn ? new Date(bangkokInstant(date, row.checkIn)).toISOString() : null,
        checkOut: row?.checkOut
          ? new Date(bangkokInstant(date, row.checkOut, manualTimes[date]?.outNextDay ?? false)).toISOString() : null,
      };
      const iso = new Date(bangkokInstant(date, editTime, editing === 'checkOut' && outNextDay)).toISOString();
      fillEmptyPunch(record, editing, iso, new Date().toISOString());
      setManualTimes(current => ({
        ...current, [date]: { ...current[date], [editing]: editTime,
          ...(editing === 'checkOut' ? { outNextDay } : {}) },
      }));
      setEditing(null);
      setEditTime('');
      setEditError('บันทึกในโหมดทดลองแล้ว · รอ HR ตรวจสอบ (ไม่ได้ส่งข้อมูลจริง)');
    } catch (error) { setEditError(error instanceof Error ? error.message : 'เวลาไม่ถูกต้อง'); }
  };

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
    setEditing(null);
    setEditTime('');
    setOutNextDay(false);
    setEditError('');
  };

  return (
    <main className="history-page">
      <header className="history-heading">
        <button type="button" className="history-heading__back" onClick={onBack} aria-label="กลับหน้าหลัก">
          <ArrowLeft size={23} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <span className="history-heading__icon" aria-hidden="true">
          <History size={23} strokeWidth={1.9} />
        </span>
        <div>
          <h1>ประวัติการทำงาน</h1>
          <p>บัตรตอกเวลาประจำเดือน</p>
        </div>
      </header>

      <div className="history-demo-notice" role="status">
        <Info size={17} aria-hidden="true" />
        <span>ตัวอย่างเพื่อทดลองดีไซน์ · ยังไม่เชื่อมข้อมูลจริง</span>
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

      <section className="history-timecard" aria-label="บัตรตอกเวลาประจำเดือน (ข้อมูลตัวอย่าง)">
        <div className="history-timecard__holes" aria-hidden="true">
          {Array.from({ length: 11 }, (_, index) => <span key={index} />)}
        </div>
        <div className="history-timecard__heading">
          <span className="history-timecard__eyebrow">EMPLOYEE TIME CARD</span>
          <h2>บัตรบันทึกเวลา</h2>
          <span className="history-timecard__record">MONTHLY RECORD · {String(month + 1).padStart(2, '0')} / {year}</span>
        </div>
        <div className="history-timecard__fields">
          <div>
            <span>ชื่อพนักงาน / EMPLOYEE</span>
            <strong>พนักงานตัวอย่าง</strong>
          </div>
          <div>
            <span>รหัสพนักงาน / ID</span><strong>—</strong>
          </div>
          <div>
            <span>ประจำเดือน / PERIOD</span>
            <strong>{thaiMonth.format(monthDate)}</strong>
          </div>
        </div>

        <div className="history-timecard__table" aria-label="รายการลงเวลาแต่ละวัน">
            <div className="history-timecard__row history-timecard__row--header" aria-hidden="true">
              <span>วันที่</span>
              <span>เข้างาน</span>
              <span>ออกงาน</span>
            </div>
            {days.map((day) => {
              const record = (entries as Record<number, DayEntry>)[day];
              const date = new Date(Date.UTC(year, month, day));
              const isFuture = date.getTime() > Date.UTC(today.year, today.month, today.day);
              const status = record?.status ?? 'empty';
              const explanation = record
                ? statusLabels[status as DayStatus]
                : isFuture ? 'ยังไม่ถึงวัน' : 'ไม่มีข้อมูล';
              return (
                <button
                  key={day}
                  type="button"
                  className={'history-timecard__row history-timecard__row--entry history-timecard__row--' + status
                    + (isFuture ? ' history-timecard__row--future' : '')}
                  onClick={(event) => openDay(day, event.currentTarget)}
                  aria-label={day + ' ' + thaiMonth.format(monthDate) + ' — ' + explanation + ' (ข้อมูลตัวอย่าง) กดเพื่อดูรายละเอียด'}
                >
                  <span className="history-timecard__date">
                    <strong>{String(day).padStart(2, '0')}</strong>
                    <small>{weekdays[date.getUTCDay()]}</small>
                  </span>
                  {record?.status === 'holiday' || record?.status === 'leave' ? (
                    <span className="history-timecard__special">{explanation}</span>
                  ) : <>
                    <span className="history-timecard__stamp">{record?.checkIn ?? (isFuture ? '—' : <Pencil size={16} aria-label="กรอกเวลาเข้าที่ว่าง" />)}</span>
                    <span className="history-timecard__stamp">{record?.checkOut ?? (isFuture ? '—' : <Pencil size={16} aria-label="กรอกเวลาออกที่ว่าง" />)}</span>
                  </>}
                </button>
              );
            })}
          </div>

        <div className="history-timecard__summary" aria-label="สรุปเวลาประจำเดือน">
          <div>
            <strong>{isSampleMonth ? workedDays : '—'}</strong>
            <span>วันทำงาน</span>
          </div>
          <div>
            <strong>{isSampleMonth ? formatPunchDuration(totalMinutes) : '—'}</strong>
            <span>ชั่วโมงรวม</span>
          </div>
        </div>
      </section>

      <p className="history-tap-hint">แตะวันที่บนบัตรเพื่อดูรายละเอียดเวลาเข้า–ออกงาน (ข้อมูลตัวอย่าง)</p>
      <p className="history-footer-note">ตัวเลขและสถานะทั้งหมดเป็นข้อมูลจำลอง ไม่ใช่ประวัติการทำงานจริง</p>

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
              {selectedEntry ? statusLabels[selectedStatus as DayStatus] : 'ยังไม่มีข้อมูล'}
            </div>

            {selectedEntry?.checkIn || selectedEntry?.checkOut ? (
              <>
                <div className="history-popup__times">
                  <div>
                    <span>เวลาเข้างาน</span>
                    <strong>{selectedEntry.checkIn ?? '—'}</strong>
                  </div>
                  <div>
                    <span>เวลาออกงาน</span>
                    <strong>{selectedEntry.checkOut ?? '—'}</strong>
                  </div>
                </div>
                {selectedEntry?.minutes !== undefined && !selectedEntry.manual && <div className="history-popup__line">
                  <span>ชั่วโมงทำงานรวม</span>
                  <strong>{formatDuration(selectedEntry.minutes)}</strong>
                </div>}
                {selectedEntry.note && <p className="history-popup__note">{selectedEntry.note}</p>}
              </>
            ) : (
              <p className="history-popup__empty">
                {selectedEntry?.note
                  ?? 'ยังไม่มีรายการเวลาเข้างานหรือออกงานในข้อมูลตัวอย่างของวันนี้'}
              </p>
            )}
            {canEditSelected && (!selectedEntry?.checkIn || !selectedEntry?.checkOut) && (
              <div className="history-edit-preview">
                <p>แตะกรอกได้เฉพาะช่องที่ยังว่าง · การกรอกนี้เป็นเพียงการทดลอง</p>
                <div className="history-edit-preview__actions">
                  {!selectedEntry?.checkIn && <button type="button" onClick={() => { setEditing('checkIn'); setEditError(''); }}>กรอกเวลาเข้า <Pencil size={14} /></button>}
                  {!selectedEntry?.checkOut && <button type="button" onClick={() => { setEditing('checkOut'); setEditError(''); }}>กรอกเวลาออก <Pencil size={14} /></button>}
                </div>
                {editing && <div className="history-edit-preview__form">
                  <label>{editing === 'checkIn' ? 'เวลาเข้างาน' : 'เวลาออกงาน'}
                    <input type="time" required value={editTime} onChange={event => setEditTime(event.target.value)} />
                  </label>
                  {editing === 'checkOut' && <label className="history-edit-preview__next">
                    <input type="checkbox" checked={outNextDay} onChange={event => setOutNextDay(event.target.checked)} /> เวลาออกเป็นวันถัดไป
                  </label>}
                  <button type="button" disabled={!editTime} onClick={saveManualTime}>บันทึกทดลอง</button>
                </div>}
              </div>
            )}
            {editError && <p className="history-edit-preview__feedback" role="status">{editError}</p>}
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
