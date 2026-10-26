import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Fingerprint,
  History,
  House,
  LogIn,
  LogOut,
  UserRound,
  X,
} from 'lucide-react';

type DialogContent = { title: string; description: string };

const navItems = [
  { id: 'home', label: 'หน้าหลัก', Icon: House },
  { id: 'history', label: 'ประวัติ', Icon: History },
  { id: 'leave', label: 'การลา', Icon: CalendarDays },
  { id: 'profile', label: 'โปรไฟล์', Icon: UserRound },
] as const;

const dateFormatter = new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function App() {
  const [now, setNow] = useState(() => new Date());
  const [dialog, setDialog] = useState<DialogContent | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const ticker = window.setInterval(updateClock, 15_000);

    // รีเฟรชทันทีเมื่อกลับมาเปิดแอปหลังพักหน้าจอ
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      window.clearInterval(ticker);
      document.removeEventListener('visibilitychange', updateClock);
    };
  }, []);

  useEffect(() => {
    if (!dialog) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    document.addEventListener('keydown', onEscape);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', onEscape);
  }, [dialog]);

  const openClockInDialog = () =>
    setDialog({
      title: 'ระบบตอกบัตรยังไม่เปิดใช้งาน',
      description:
        'ตอนนี้เป็นตัวอย่างหน้า Home เพื่อทดสอบดีไซน์เท่านั้น ยังไม่ได้เชื่อม Firebase หรือบันทึกเวลาเข้างานจริง',
    });

  const openNotReadyDialog = (pageName: string) =>
    setDialog({
      title: pageName,
      description:
        'หน้านี้จะออกแบบในขั้นตอนถัดไป ตอนนี้เรากำลังทำหน้า Home ของพนักงานให้ใช้งานง่ายก่อน',
    });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand" aria-label="Attendance ระบบบันทึกเวลาทำงาน">
          <span className="brand__icon" aria-hidden="true">
            <Clock3 strokeWidth={2.4} size={29} />
          </span>
          <div className="brand__text">
            <strong>Attendance</strong>
            <span>ระบบบันทึกเวลาทำงาน</span>
          </div>
        </div>

        <button
          className="profile-button"
          type="button"
          onClick={() => openNotReadyDialog('โปรไฟล์')}
          aria-label="เปิดโปรไฟล์"
        >
          <UserRound size={25} strokeWidth={1.9} />
        </button>
      </header>

      <main className="home-content" id="main-content">
        <section className="clock-panel" aria-label="เวลาปัจจุบัน">
          <time className="clock-panel__time" dateTime={now.toISOString()}>
            {timeFormatter.format(now)}
          </time>
          <p className="clock-panel__date">{dateFormatter.format(now)}</p>
        </section>

        <section className="action-area" aria-label="บันทึกเวลาเข้างาน">
          <div className="action-area__halo" aria-hidden="true" />
          <button
            className="clock-button"
            type="button"
            onClick={openClockInDialog}
            aria-label="เข้างาน — ดูรายละเอียดการเปิดใช้งานระบบ"
          >
            <Fingerprint className="clock-button__icon" size={61} strokeWidth={1.55} />
            <span className="clock-button__title">เข้างาน</span>
            <span className="clock-button__hint">แตะเพื่อบันทึกเวลา</span>
          </button>
        </section>

        <section className="day-overview" aria-label="สรุปเวลาทำงานวันนี้">
          <div className="day-overview__item">
            <LogIn size={29} strokeWidth={1.8} aria-hidden="true" />
            <strong>--:--</strong>
            <span>เข้างาน</span>
          </div>
          <div className="day-overview__separator" aria-hidden="true" />
          <div className="day-overview__item">
            <LogOut size={29} strokeWidth={1.8} aria-hidden="true" />
            <strong>--:--</strong>
            <span>ออกงาน</span>
          </div>
          <div className="day-overview__separator" aria-hidden="true" />
          <div className="day-overview__item">
            <Clock3 size={29} strokeWidth={1.8} aria-hidden="true" />
            <strong>--</strong>
            <span>ชั่วโมงทำงาน</span>
          </div>
        </section>
        <p className="preview-notice">ตัวอย่างดีไซน์ · ยังไม่บันทึกเวลาจริง</p>
      </main>

      <nav className="bottom-nav" aria-label="เมนูหลัก">
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={id === 'home' ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'}
            type="button"
            aria-current={id === 'home' ? 'page' : undefined}
            onClick={() => {
              if (id !== 'home') openNotReadyDialog(label);
            }}
          >
            <Icon size={24} strokeWidth={id === 'home' ? 2.25 : 1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {dialog && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <section
            className="app-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
          >
            <button
              className="app-dialog__close"
              ref={closeButtonRef}
              type="button"
              aria-label="ปิดหน้าต่าง"
              onClick={() => setDialog(null)}
            >
              <X size={23} />
            </button>
            <div className="app-dialog__symbol" aria-hidden="true">
              <Clock3 size={30} strokeWidth={2} />
            </div>
            <h2 id="dialog-title">{dialog.title}</h2>
            <p id="dialog-description">{dialog.description}</p>
            <button className="app-dialog__confirm" type="button" onClick={() => setDialog(null)}>
              เข้าใจแล้ว
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
