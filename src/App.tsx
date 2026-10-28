import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Fingerprint,
  History,
  House,
  FilePenLine,
  LogIn,
  LogOut,
  Moon,
  Palette,
  Sun,
  Sunrise,
  Sunset,
  UserRound,
  X,
} from 'lucide-react';
import SkyScene from './SkyScene';
import HistoryPage from './HistoryPage';
import CalendarPage from './CalendarPage';
import LeavePage from './LeavePage';
import ProfilePage from './ProfilePage';
import {
  getBangkokPeriod,
  periodNames,
  periodThemeColors,
  type AttendanceDisplayState,
  type DayPeriod,
} from './theme';

type InfoDialog = { title: string; description: string };
type Dialog = InfoDialog | 'preview' | null;
type ThemeSelection = DayPeriod | null;

const navigation = [
  { key: 'home', label: 'หน้าหลัก', Icon: House },
  { key: 'calendar', label: 'ปฏิทิน', Icon: CalendarDays },
  { key: 'leave', label: 'การลา', Icon: FilePenLine },
  { key: 'profile', label: 'โปรไฟล์', Icon: UserRound },
] as const;

const themeOptions = [
  { id: 'morning', label: 'เช้า', Icon: Sunrise },
  { id: 'day', label: 'เที่ยง', Icon: Sun },
  { id: 'evening', label: 'เย็น', Icon: Sunset },
  { id: 'night', label: 'กลางคืน', Icon: Moon },
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

// Match the calendar backdrop's rgba(6, 21, 32, .60) on iOS's native
// status-bar canvas, where a web overlay cannot dim the system-owned area.
function dimForCalendar(hex: string): string {
  const backdrop = [6, 21, 32];
  const channels = [1, 3, 5].map((at, index) => {
    const original = Number.parseInt(hex.slice(at, at + 2), 16);
    return Math.round(original * 0.4 + backdrop[index] * 0.6)
      .toString(16).padStart(2, '0');
  });
  return '#' + channels.join('');
}

function App() {
  const [now, setNow] = useState(() => new Date());
  const [previewTheme, setPreviewTheme] = useState<ThemeSelection>(null);
  const [previewAttendance, setPreviewAttendance] = useState<AttendanceDisplayState | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'leave' | 'profile'>('home');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarDialogRef = useRef<HTMLElement>(null);

  const period = previewTheme ?? getBangkokPeriod(now);
  // Firebase attendance is not connected. Do not invent check-in/out records.
  const state: AttendanceDisplayState = previewAttendance ?? 'before';
  const isPreviewingAttendance = previewAttendance !== null;
  const isDemo = previewTheme !== null || isPreviewingAttendance;
  const active = state === 'working';
  const finished = state === 'finished';
  const checkIn = state === 'before' ? '--:--' : '08:32';
  const checkOut = finished ? '17:45' : '--:--';
  const workHours = finished ? '9 ชม. 13 นาที' : active ? 'ตัวอย่าง' : '--';
  const cardTitle = finished ? 'ออกงานแล้ว' : active ? 'เข้างานแล้ว' : 'เข้างาน';
  const cardSubtitle = finished ? 'เมื่อ 17:45 น.' : active ? 'เมื่อ 08:32 น.' : 'แตะเพื่อบันทึกเวลา';
  const statusLabel = finished
    ? 'สิ้นสุดการทำงานวันนี้ (สาธิต)'
    : active
      ? 'กำลังทำงาน (สาธิต)'
      : 'ยังไม่ได้เชื่อมข้อมูลการลงเวลา';
  const clockText = timeFormatter.format(now);
  const [clockHours, clockMinutes] = clockText.split(':');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  useEffect(() => {
    // iOS standalone PWA can rubber-band the page even when an inner scroller
    // has overscroll-behavior:none. Stop only attempts to drag past the FIRST
    // or LAST item; all ordinary content scrolling remains native and smooth.
    const scroller = scrollRef.current;
    if (!scroller) return;
    let lastTouchY: number | null = null;

    const onTouchStart = (event: TouchEvent) => {
      lastTouchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || lastTouchY === null) return;
      const touchY = event.touches[0].clientY;
      const deltaY = touchY - lastTouchY;
      lastTouchY = touchY;
      const atTop = scroller.scrollTop <= 0;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      if ((deltaY > 0 && atTop) || (deltaY < 0 && atBottom)) {
        event.preventDefault();
      }
    };
    const onTouchEnd = () => { lastTouchY = null; };
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    scroller.addEventListener('touchend', onTouchEnd);
    scroller.addEventListener('touchcancel', onTouchEnd);
    return () => {
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      scroller.removeEventListener('touchend', onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 15_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);

  useEffect(() => {
    // Pixel-art sky colors belong only to Home.
    // Other screens use a white system bar in light mode and the app's
    // dark background in night mode, regardless of the time-of-day sky.
    const chromeColor = activeTab === 'home'
      ? periodThemeColors[period]
      : (period === 'night' ? '#0e233b' : '#ffffff');
    const visibleChromeColor = calendarOpen ? dimForCalendar(chromeColor) : chromeColor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', visibleChromeColor);
    document.documentElement.dataset.period = period;
    document.documentElement.dataset.view = activeTab;
    document.documentElement.dataset.calendarOpen = calendarOpen ? 'true' : 'false';
    if (calendarOpen) {
      document.documentElement.style.setProperty('--calendar-chrome-color', visibleChromeColor);
    } else {
      document.documentElement.style.removeProperty('--calendar-chrome-color');
    }
  }, [period, activeTab, calendarOpen]);

  useEffect(() => {
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [dialog]);

  useEffect(() => {
    if (!calendarOpen) return;
    const dialogElement = calendarDialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogElement?.querySelector<HTMLButtonElement>('.calendar-close')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      // Day details are a second dialog above the calendar. Let that dialog
      // handle Escape/Tab first, so Esc closes only the selected day.
      if (document.querySelector('.calendar-day-overlay')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setCalendarOpen(false);
      }
      if (event.key !== 'Tab' || !dialogElement) return;
      const focusable = Array.from(dialogElement.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
      previousFocus?.focus();
    };
  }, [calendarOpen]);

  const openInfo = (title: string, description: string) => setDialog({ title, description });
  const openClockInfo = () => openInfo(
    'ระบบตอกบัตรยังไม่เปิดใช้งาน',
    'นี่คือหน้าออกแบบสำหรับทดลองใช้งาน ระบบยังไม่ได้เชื่อม Firebase จึงไม่มีการบันทึกเวลาเข้างานหรือออกงานจริง',
  );

  return (
    <div className="app-shell" data-period={period} data-view={activeTab} data-calendar-open={calendarOpen ? 'true' : undefined}>
      {/* Remount the fixed color source when theme OR screen changes so iOS
          resamples it without changing the hero or safe-area layout. */}
      <div key={period + '-' + activeTab + (calendarOpen ? '-dimmed' : '')} className="status-bar-tint" aria-hidden="true" />
      <div className="app-scroll" ref={scrollRef}>
        {activeTab === 'home' ? (
          <>
        <section className="hero" aria-label={'บรรยากาศช่วง' + periodNames[period]}>
          <SkyScene period={period} />

          <header className="app-header">
            <div className="brand">
              <span className="brand__mark" aria-hidden="true"><Clock3 size={27} strokeWidth={2.2} /></span>
              <div className="brand__identity">
                <strong>Attendance</strong>
                <span>ระบบบันทึกเวลาทำงาน</span>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="header-icon header-icon--preview"
                type="button"
                onClick={() => setDialog('preview')}
                aria-label="ทดลองดูธีมเวลาและสถานะต่าง ๆ"
                title="ทดลองดูธีม"
              >
                <Palette size={22} strokeWidth={1.9} />
              </button>
              <button
                className="header-icon header-icon--history"
                type="button"
                onClick={() => setActiveTab('history')}
                aria-label="เปิดประวัติการทำงาน"
                title="ประวัติการทำงาน"
              >
                <History size={22} strokeWidth={1.9} />
              </button>
              <button
                className="header-icon"
                type="button"
                onClick={() => setActiveTab('profile')}
                aria-label="โปรไฟล์"
              >
                <UserRound size={23} strokeWidth={1.9} />
              </button>
            </div>
          </header>

          <div className="clock-panel">
            <p className="clock-panel__date">{dateFormatter.format(now)}</p>
            <time className="clock-panel__time" dateTime={now.toISOString()} aria-label={'เวลา ' + clockText + ' นาฬิกา'}>
              <span>{clockHours}</span>
              <span className="clock-panel__separator" aria-hidden="true">:</span>
              <span>{clockMinutes}</span>
            </time>
          </div>
        </section>

        <main className="home-content">
          <button
            type="button"
            className={'attendance-card attendance-card--' + state}
            onClick={openClockInfo}
            aria-label={cardTitle + ' — ดูสถานะการเชื่อมต่อระบบ'}
          >
            <span className="attendance-card__symbol" aria-hidden="true">
              {state === 'before'
                ? <Fingerprint size={53} strokeWidth={1.75} />
                : finished
                  ? <LogOut size={50} strokeWidth={1.8} />
                  : <Check size={56} strokeWidth={2.4} />}
            </span>
            <strong>{cardTitle}</strong>
            <span className="attendance-card__subtitle">{cardSubtitle}</span>
          </button>

          <button
            className="status-strip"
            type="button"
            onClick={() => openInfo('สถานะวันนี้', 'ขณะนี้หน้า Home ยังไม่ได้เชื่อมข้อมูลการลงเวลา การแสดงเวลาเข้างานและออกงานในโหมดสาธิตไม่ใช่ข้อมูลจริง')}
          >
            <span className={'status-strip__indicator status-strip__indicator--' + state} aria-hidden="true" />
            <span>{statusLabel}</span>
            <ChevronRight size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>

          <section className="summary-card" aria-label="สรุปเวลาทำงานวันนี้">
            <div className="summary-card__item">
              <LogIn size={25} strokeWidth={1.8} aria-hidden="true" />
              <span>เข้างาน</span>
              <strong>{checkIn}</strong>
            </div>
            <div className="summary-card__item">
              <LogOut size={25} strokeWidth={1.8} aria-hidden="true" />
              <span>ออกงาน</span>
              <strong>{checkOut}</strong>
            </div>
            <div className="summary-card__item">
              <Clock3 size={25} strokeWidth={1.8} aria-hidden="true" />
              <span>ชั่วโมงทำงาน</span>
              <strong className={finished ? 'summary-card__duration' : undefined}>{workHours}</strong>
            </div>
          </section>

          <section className="work-section" aria-labelledby="work-title">
            <button
              className="work-today-card"
              type="button"
              onClick={() => openInfo('งานวันนี้', 'ตารางงานจะเชื่อมกับข้อมูลจริงในขั้นตอนต่อไป')}
              aria-label="งานวันนี้ ดูรายละเอียดและกำหนดการทั้งหมด"
            >
              <span className="work-today-card__icon" aria-hidden="true">
                <CalendarDays size={24} strokeWidth={1.85} />
              </span>
              <span className="work-today-card__content">
                <strong id="work-title">งานวันนี้</strong>
                <span>{isPreviewingAttendance
                  ? 'งานปกติ · 08:30 – 17:30 (ตัวอย่าง)'
                  : 'ยังไม่มีข้อมูลตารางงาน'}</span>
              </span>
              <ChevronRight className="work-today-card__arrow" size={22} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </section>

          <p className="preview-notice" role="status">
            {isDemo ? 'กำลังแสดงธีม/สถานะตัวอย่าง · ไม่มีการบันทึกข้อมูลจริง' : 'เวอร์ชันทดลองดีไซน์ · ยังไม่เชื่อมระบบบันทึกเวลา'}
          </p>
        </main>
          </>
        ) : activeTab === 'history' ? (
          <HistoryPage onBack={() => setActiveTab('home')} />
        ) : activeTab === 'leave' ? (
          <LeavePage now={now} onBack={() => setActiveTab('home')} />
        ) : (
          <ProfilePage
            onBack={() => setActiveTab('home')}
            onHistory={() => setActiveTab('history')}
            onLeave={() => setActiveTab('leave')}
          />
        )}
      </div>

      <nav className="bottom-nav" aria-label="เมนูหลัก">
        {navigation.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={'bottom-nav__item' + ((key === 'calendar' ? calendarOpen : key === activeTab) ? ' bottom-nav__item--active' : '')}
            aria-current={key !== 'calendar' && key === activeTab && !calendarOpen ? 'page' : undefined}
            aria-haspopup={key === 'calendar' ? 'dialog' : undefined}
            aria-expanded={key === 'calendar' ? calendarOpen : undefined}
            onClick={() => {
              if (key === 'home') setActiveTab('home');
              else if (key === 'calendar') setCalendarOpen(true);
              else if (key === 'leave') setActiveTab('leave');
              else if (key === 'profile') setActiveTab('profile');
            }}
          >
            <Icon size={24} strokeWidth={((key === 'calendar' ? calendarOpen : key === activeTab) ? 2.3 : 1.85)} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {calendarOpen && (
        <div className="calendar-popup-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCalendarOpen(false);
        }}>
          <section
            className="calendar-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-popup-title"
            ref={calendarDialogRef}
          >
            <CalendarPage now={now} onClose={() => setCalendarOpen(false)} />
          </section>
        </div>
      )}

      {dialog !== null && (
        <div className="dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDialog(null);
        }}>
          <section className="app-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <button className="dialog-close" ref={closeRef} onClick={() => setDialog(null)} aria-label="ปิดหน้าต่าง" type="button">
              <X size={23} />
            </button>
            {dialog === 'preview' ? (
              <>
                <div className="dialog-icon" aria-hidden="true"><Palette size={28} /></div>
                <h2 id="dialog-title">ทดลองดูดีไซน์</h2>
                <p className="dialog-description">เลือกช่วงเวลาและสถานะเพื่อดูหน้าตาแอป โดยไม่แก้ข้อมูลการทำงานจริง</p>
                <h3 className="preview-heading">ธีมตามช่วงเวลา</h3>
                <div className="theme-options">
                  <button type="button" aria-pressed={previewTheme === null} className={previewTheme === null ? 'is-selected' : ''} onClick={() => setPreviewTheme(null)}>อัตโนมัติ</button>
                  {themeOptions.map(({ id, label, Icon }) => (
                    <button type="button" key={id} aria-pressed={previewTheme === id} className={previewTheme === id ? 'is-selected' : ''} onClick={() => setPreviewTheme(id)}>
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </div>
                <h3 className="preview-heading">ตัวอย่างสถานะการทำงาน</h3>
                <div className="state-options">
                  <button type="button" aria-pressed={previewAttendance === null} className={previewAttendance === null ? 'is-selected' : ''} onClick={() => setPreviewAttendance(null)}>ยังไม่มีข้อมูล</button>
                  <button type="button" aria-pressed={previewAttendance === 'working'} className={previewAttendance === 'working' ? 'is-selected' : ''} onClick={() => setPreviewAttendance('working')}>เข้างานแล้ว</button>
                  <button type="button" aria-pressed={previewAttendance === 'finished'} className={previewAttendance === 'finished' ? 'is-selected' : ''} onClick={() => setPreviewAttendance('finished')}>ออกงานแล้ว</button>
                </div>
                <p className="preview-explanation">เวลาที่แสดงบนหน้าจอยังคงเป็นเวลาประเทศไทยจริง ส่วนเวลาตอกบัตรในโหมดสาธิตเป็นเพียงตัวอย่าง</p>
                <button className="dialog-primary" type="button" onClick={() => setDialog(null)}>ดูตัวอย่างหน้าจอ</button>
              </>
            ) : (
              <>
                <div className="dialog-icon" aria-hidden="true"><Clock3 size={28} /></div>
                <h2 id="dialog-title">{dialog.title}</h2>
                <p className="dialog-description">{dialog.description}</p>
                <button className="dialog-primary" type="button" onClick={() => setDialog(null)}>เข้าใจแล้ว</button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
