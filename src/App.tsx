import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
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

function App() {
  const [now, setNow] = useState(() => new Date());
  const [previewTheme, setPreviewTheme] = useState<ThemeSelection>(null);
  const [previewAttendance, setPreviewAttendance] = useState<AttendanceDisplayState | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home');
  const [skyEdge, setSkyEdge] = useState<{ period: DayPeriod; dataUrl: string } | null>(null);
  const handleSkyEdgeReady = useCallback((imagePeriod: DayPeriod, dataUrl: string) => {
    setSkyEdge(previous => previous?.period === imagePeriod && previous.dataUrl === dataUrl
      ? previous : { period: imagePeriod, dataUrl });
  }, []);

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

  useLayoutEffect(() => {
    // Update before paint when navigating so iOS never holds Home's sky color
    // above the History screen. The approved skyline geometry stays untouched.
    document.documentElement.dataset.period = period;
    document.documentElement.dataset.view = activeTab;
    const chromeColor = activeTab === 'history'
      ? (period === 'night' ? '#0e233b' : '#f0f5f5')
      : periodThemeColors[period];
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', chromeColor);
  }, [activeTab, period]);

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

  const openInfo = (title: string, description: string) => setDialog({ title, description });
  const openClockInfo = () => openInfo(
    'ระบบตอกบัตรยังไม่เปิดใช้งาน',
    'นี่คือหน้าออกแบบสำหรับทดลองใช้งาน ระบบยังไม่ได้เชื่อม Firebase จึงไม่มีการบันทึกเวลาเข้างานหรือออกงานจริง',
  );

  return (
    <div className="app-shell" data-period={period} data-view={activeTab}>
      <div
        className="status-sky-extension"
        aria-hidden="true"
        style={skyEdge?.period === period
          ? { backgroundImage: `url("${skyEdge.dataUrl}")` }
          : undefined}
      />
      <div className="app-scroll" ref={scrollRef}>
        {activeTab === 'home' ? (
          <>
        <section className="hero" aria-label={'บรรยากาศช่วง' + periodNames[period]}>
          <SkyScene period={period} onSkyEdgeReady={handleSkyEdgeReady} />

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
                onClick={() => openInfo('โปรไฟล์', 'หน้าโปรไฟล์จะพัฒนาในขั้นตอนถัดไป')}
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

          <section className="work-section" aria-label="งานวันนี้">
            <button
              className="today-task"
              type="button"
              onClick={() => openInfo('งานวันนี้', 'ตารางงานจะเชื่อมกับข้อมูลจริงในขั้นตอนต่อไป')}
            >
              <span className="today-task__icon" aria-hidden="true">
                {isPreviewingAttendance ? <BriefcaseBusiness size={23} /> : <CalendarDays size={23} />}
              </span>
              <span className="today-task__text">
                <strong>งานวันนี้</strong>
                {isPreviewingAttendance ? (
                  <span>งานปกติ (ตัวอย่าง) · 08:30–17:30 น.</span>
                ) : (
                  <span>ยังไม่มีข้อมูลตารางงาน</span>
                )}
              </span>
              <ChevronRight className="today-task__arrow" size={21} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </section>

          <p className="preview-notice" role="status">
            {isDemo ? 'กำลังแสดงธีม/สถานะตัวอย่าง · ไม่มีการบันทึกข้อมูลจริง' : 'เวอร์ชันทดลองดีไซน์ · ยังไม่เชื่อมระบบบันทึกเวลา'}
          </p>
        </main>
          </>
        ) : (
          <HistoryPage onBack={() => setActiveTab('home')} />
        )}
      </div>

      <nav className="bottom-nav" aria-label="เมนูหลัก">
        {navigation.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={'bottom-nav__item' + (key === activeTab ? ' bottom-nav__item--active' : '')}
            aria-current={key === activeTab ? 'page' : undefined}
            onClick={() => {
              if (key === 'home') setActiveTab('home');
              else if (key === 'calendar') openInfo('ปฏิทิน', 'เราจะออกแบบหน้าปฏิทินสำหรับตารางงานและนัดหมายในขั้นตอนถัดไป');
              else openInfo(label, 'หน้านี้ยังไม่ได้พัฒนา เราจะออกแบบทีละหน้าตามที่ตกลงกัน');
            }}
          >
            <Icon size={24} strokeWidth={key === activeTab ? 2.3 : 1.85} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

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
