import { useEffect, useState } from "react";
import "./HomePage.css";

type DemoStatus = "not-started" | "working" | "finished";

const thaiDate = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});
const shortTime = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
const digitalTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

function Icon({ name, size = 22 }: { name: "arrow" | "pin" | "clock" | "rotate"; size?: number }) {
  const paths = {
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    rotate: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">{paths[name]}</svg>
  );
}

function LiveClock() {
  // Only this component updates each second, not the rest of the page.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = digitalTime.format(now).split(":");

  return (
    <div className="simple-clock" aria-label={`เวลาปัจจุบัน ${digitalTime.format(now)}`}>
      <span>{parts[0]}:{parts[1]}</span>
      <span className="simple-clock-seconds">:{parts[2]}</span>
    </div>
  );
}

export function HomePage() {
  // This is a visual prototype. It does not access Firebase or GPS.
  const [clockInAt, setClockInAt] = useState<Date | null>(null);
  const [clockOutAt, setClockOutAt] = useState<Date | null>(null);

  const status: DemoStatus = !clockInAt ? "not-started" : !clockOutAt ? "working" : "finished";
  const statusLabel = status === "not-started" ? "ยังไม่ได้เข้างาน"
    : status === "working" ? "เข้างานแล้ว" : "เลิกงานแล้ว";
  const actionLabel = status === "not-started" ? "ทดลองเข้างาน"
    : status === "working" ? "ทดลองเลิกงาน" : "เริ่มทดลองใหม่";

  function handleAction() {
    if (status === "not-started") {
      setClockInAt(new Date());
    } else if (status === "working") {
      setClockOutAt(new Date());
    } else {
      setClockInAt(null);
      setClockOutAt(null);
    }
  }

  return (
    <div className="simple-home">
      <header className="simple-home-header">
        <div>
          <h1>สวัสดีครับ</h1>
          <p>บันทึกเวลาทำงานได้ง่าย ๆ ในที่เดียว</p>
        </div>
        <span className="simple-home-date">{thaiDate.format(new Date())}</span>
      </header>

      <p className="simple-preview-note" role="note">
        <span className="simple-preview-dot" aria-hidden="true" />
        นี่คือหน้าทดลอง ยังไม่บันทึกข้อมูลจริง
      </p>

      <section className="simple-attendance" aria-labelledby="simple-attendance-title">
        <header className="simple-attendance-heading">
          <h2 id="simple-attendance-title">บันทึกเวลาวันนี้</h2>
          <span className="simple-demo-label">DEMO</span>
        </header>

        <div className="simple-attendance-content">
          <div className="simple-clock-area">
            <span className="simple-section-label"><Icon name="clock" size={18} /> เวลาปัจจุบัน</span>
            <LiveClock />
            <p>เวลาจากอุปกรณ์ของคุณ</p>
          </div>

          <div className="simple-action-area">
            <span className="simple-section-label">สถานะการทำงาน</span>
            <div className="simple-work-state" aria-live="polite" aria-atomic="true">
              <span className={`simple-state-dot simple-state-${status}`} aria-hidden="true" />
              <strong>{statusLabel}</strong>
            </div>
            <button className={`simple-action-button simple-action-${status}`} type="button" onClick={handleAction}>
              {actionLabel}
              <Icon name={status === "finished" ? "rotate" : "arrow"} size={21} />
            </button>
            <p className="simple-action-hint">ปุ่มนี้ใช้ดูตัวอย่างเท่านั้น</p>
          </div>
        </div>

        <div className="simple-attendance-times" aria-label="สรุปเวลาทดลอง">
          <div className="simple-attendance-time">
            <span>เวลาเข้างาน</span>
            <strong>{clockInAt ? shortTime.format(clockInAt) : "--:--"}</strong>
          </div>
          <div className="simple-attendance-time">
            <span>เวลาเลิกงาน</span>
            <strong>{clockOutAt ? shortTime.format(clockOutAt) : "--:--"}</strong>
          </div>
        </div>
      </section>

      <section className="simple-location" aria-labelledby="simple-location-title">
        <span className="simple-location-icon"><Icon name="pin" size={23} /></span>
        <div className="simple-location-copy">
          <h2 id="simple-location-title">สถานที่ทำงาน</h2>
          <p>ยังไม่ได้เปิดใช้งาน GPS</p>
        </div>
        <span className="simple-location-tag">รอเชื่อมต่อ</span>
      </section>
    </div>
  );
}
