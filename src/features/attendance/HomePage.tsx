import { useEffect, useState } from "react";
import "./HomePage.css";

type SymbolName = "clock" | "check" | "arrow" | "pin" | "shield" | "spark" | "calendar" | "refresh";

function SymbolIcon({ name, size = 22 }: { name: SymbolName; size?: number }) {
  const shapes = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2.5" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    shield: <><path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z" /><path d="m9 12 2 2 4-4" /></>,
    spark: <><path d="m12 3 1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6L12 3Z" /><path d="m19 18 .6 1.4L21 20l-1.4.6L19 22l-.6-1.4L17 20l1.4-.6L19 18Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 15h3" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2" /></>
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes[name]}
    </svg>
  );
}

const clockTime = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});
const shortTime = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
const dateFormat = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});

function LiveClock() {
  // Keep the clock update inside this component; the entire Home page
  // and its layout do not re-render each second.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const [hours, minutes, seconds] = clockTime.format(now).split(":");

  return (
    <div className="home-live-clock" aria-label={`เวลาปัจจุบัน ${clockTime.format(now)} นาฬิกา`}>
      <span>{hours}:{minutes}</span><span className="home-live-clock-seconds">:{seconds}</span>
    </div>
  );
}

export function HomePage() {
  // UI-only demonstration. No network, persistence, GPS or attendance writes.
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const phase = !checkInTime ? "ready" : !checkOutTime ? "working" : "done";

  const statusText = phase === "ready"
    ? "ยังไม่ได้เข้างาน"
    : phase === "working" ? "เข้างานแล้ว" : "เลิกงานแล้ว";
  const actionText = phase === "ready"
    ? "ทดลองเข้างาน"
    : phase === "working" ? "ทดลองเลิกงาน" : "เริ่มทดลองใหม่";
  const statusDescription = phase === "ready"
    ? "เริ่มวันทำงานได้ด้วยปุ่มเดียว"
    : phase === "working"
      ? "ทดลองเข้างานสำเร็จแล้ว สามารถทดลองเลิกงานต่อได้"
      : "ทดลองครบแล้ว กดเริ่มใหม่เพื่อดูอีกครั้ง";

  function handleDemoAction() {
    if (phase === "ready") {
      setCheckInTime(new Date());
    } else if (phase === "working") {
      setCheckOutTime(new Date());
    } else {
      setCheckInTime(null);
      setCheckOutTime(null);
    }
  }

  return (
    <div className="home-redesign">
      <header className="home-welcome">
        <div className="home-welcome-main">
          <span className="home-welcome-eyebrow">ยินดีต้อนรับ · ATTENDANCE V2</span>
          <h1>สวัสดีครับ <span aria-hidden="true">✳</span></h1>
          <p>ทุกวันทำงาน เริ่มต้นได้อย่างง่ายดาย</p>
        </div>
        <div className="home-today-pill">
          <SymbolIcon name="calendar" size={18} />
          <span>{dateFormat.format(new Date())}</span>
        </div>
      </header>

      <div className="home-demo-banner" role="note">
        <span className="home-demo-indicator" aria-hidden="true" />
        <span><strong>ตัวอย่างดีไซน์ใหม่</strong> · ลองกดเข้างานหรือเลิกงานได้ แต่จะไม่บันทึกข้อมูลจริง</span>
      </div>

      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-shimmer" aria-hidden="true" />
        <div className="home-hero-main">
          <div className="home-hero-top">
            <p id="home-hero-title" className="home-hero-kicker">บันทึกเวลาทำงาน</p>
            <span className="home-hero-demo-tag"><span aria-hidden="true" /> DEMO</span>
          </div>

          <div className="home-hero-clock-content">
            <p className="home-clock-caption">เวลาปัจจุบัน</p>
            <LiveClock />
            <p className="home-clock-hint">แสดงเวลาจากอุปกรณ์ของคุณ</p>
          </div>

          <div className="home-status-group" aria-live="polite" aria-atomic="true">
            <span className={`home-status-pill home-status-${phase}`}>
              <span className="home-status-pulse" aria-hidden="true" />
              {statusText}
            </span>
            <p className="home-status-description">{statusDescription}</p>
          </div>

          <button className="home-action-button" type="button" onClick={handleDemoAction}>
            <span className="home-action-symbol">
              <SymbolIcon name={phase === "done" ? "refresh" : phase === "working" ? "check" : "arrow"} size={23} />
            </span>
            <span>{actionText}</span>
            <span className="home-action-tail" aria-hidden="true"><SymbolIcon name="arrow" size={20} /></span>
          </button>
          <p className="home-action-disclaimer">
            <SymbolIcon name="shield" size={15} />
            โหมดทดลองเท่านั้น ไม่มีการบันทึกเข้าระบบ
          </p>
        </div>

        <div className="home-hero-art" aria-hidden="true">
          <div className="home-orbit home-orbit-outer" />
          <div className="home-orbit home-orbit-middle" />
          <div className="home-orbit home-orbit-inner">
            <div className="home-orbit-center">
              <SymbolIcon name="clock" size={68} />
            </div>
          </div>
          <span className="home-orbit-dot home-orbit-dot-one" />
          <span className="home-orbit-dot home-orbit-dot-two" />
          <span className="home-orbit-small-stars">✦</span>
        </div>
      </section>

      <section className="home-today-section" aria-labelledby="home-today-title">
        <div className="home-section-heading">
          <div>
            <p className="home-section-eyebrow">TODAY</p>
            <h2 id="home-today-title">สรุปเวลาวันนี้</h2>
          </div>
          <span className="home-section-helper">ข้อมูลจำลองบนหน้าจอ</span>
        </div>

        <div className="home-metric-grid">
          <article className="home-metric">
            <div className="home-metric-heading">
              <span className="home-metric-icon home-metric-icon-in"><SymbolIcon name="arrow" size={20} /></span>
              <span className="home-metric-label">เวลาเข้างาน</span>
            </div>
            <strong className="home-metric-time">{checkInTime ? shortTime.format(checkInTime) : "--:--"}</strong>
            <p className="home-metric-footnote">{checkInTime ? "ทดลองเข้างานแล้ว" : "ยังไม่ได้เข้างาน"}</p>
          </article>
          <article className="home-metric">
            <div className="home-metric-heading">
              <span className="home-metric-icon home-metric-icon-out"><SymbolIcon name="clock" size={20} /></span>
              <span className="home-metric-label">เวลาเลิกงาน</span>
            </div>
            <strong className="home-metric-time">{checkOutTime ? shortTime.format(checkOutTime) : "--:--"}</strong>
            <p className="home-metric-footnote">{checkOutTime ? "ทดลองเลิกงานแล้ว" : "ยังไม่ได้เลิกงาน"}</p>
          </article>
        </div>
      </section>

      <div className="home-bottom-grid">
        <section className="home-location-card" aria-labelledby="home-location-title">
          <span className="home-bottom-icon home-bottom-icon-pin"><SymbolIcon name="pin" size={24} /></span>
          <div className="home-bottom-copy">
            <h2 id="home-location-title">สถานที่ทำงาน</h2>
            <p>ระบบ GPS ยังไม่ได้เชื่อมต่อ</p>
            <span>เมื่อติดตั้งระบบจริง จะแสดงไซต์งานของคุณตรงนี้</span>
          </div>
          <span className="home-location-tag">รอเชื่อมต่อ</span>
        </section>

        <section className="home-tip-card" aria-labelledby="home-tip-title">
          <span className="home-bottom-icon home-bottom-icon-spark"><SymbolIcon name="spark" size={24} /></span>
          <div className="home-bottom-copy">
            <h2 id="home-tip-title">ใช้ง่ายใน 2 ขั้นตอน</h2>
            <p>เมื่อถึงที่ทำงาน กดเข้างาน · ก่อนกลับกดเลิกงาน</p>
            <span>ปุ่มเดียว ระบบเปลี่ยนตามสถานะให้เอง</span>
          </div>
        </section>
      </div>
    </div>
  );
}
