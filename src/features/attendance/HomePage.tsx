import { useEffect, useState } from "react";
import "./HomePage.css";

type DemoStatus = "not-started" | "working" | "finished";
type IconName = "arrow" | "pin" | "clock" | "rotate" | "check";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});
const shortTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths = {
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    rotate: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function LiveClock() {
  // The clock updates in its own component so the rest of the page stays still.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const [hour, minute, second] = clockFormatter.format(now).split(":");

  return (
    <div className="atelier-clock" aria-label={`เวลาปัจจุบัน ${clockFormatter.format(now)} นาฬิกา`}>
      <span>{hour}:{minute}</span>
      <span className="atelier-clock-seconds">:{second}</span>
    </div>
  );
}

export function HomePage() {
  // Demo-only interaction. No Firebase, GPS, storage or real attendance writes.
  const [checkInAt, setCheckInAt] = useState<Date | null>(null);
  const [checkOutAt, setCheckOutAt] = useState<Date | null>(null);

  const status: DemoStatus = !checkInAt ? "not-started" : !checkOutAt ? "working" : "finished";
  const statusLabel = status === "not-started" ? "ยังไม่ได้เข้างาน"
    : status === "working" ? "กำลังทำงาน" : "เลิกงานแล้ว";
  const statusHint = status === "not-started" ? "พร้อมเริ่มบันทึกเวลาของวันนี้"
    : status === "working" ? "บันทึกเวลาเข้างานตัวอย่างแล้ว" : "บันทึกเวลาตัวอย่างครบแล้ว";
  const actionLabel = status === "not-started" ? "ทดลองเข้างาน"
    : status === "working" ? "ทดลองเลิกงาน" : "เริ่มทดลองใหม่";

  function handleAction() {
    if (status === "not-started") setCheckInAt(new Date());
    else if (status === "working") setCheckOutAt(new Date());
    else {
      setCheckInAt(null);
      setCheckOutAt(null);
    }
  }

  return (
    <div className="atelier-home">
      <header className="atelier-intro">
        <div>
          <span className="atelier-intro-kicker">วันทำงานของคุณ</span>
          <h1>สวัสดีครับ<span className="atelier-greeting-mark" aria-hidden="true">.</span></h1>
          <p>เริ่มต้นวันใหม่ ได้ในปุ่มเดียว</p>
        </div>
        <span className="atelier-date">{dateFormatter.format(new Date())}</span>
      </header>

      <section className="atelier-attendance" aria-labelledby="atelier-attendance-title">
        <div className="atelier-display">
          <div className="atelier-display-header">
            <h2 id="atelier-attendance-title">บันทึกเวลาทำงาน</h2>
            <span className="atelier-preview-label">ตัวอย่าง</span>
          </div>

          <div className="atelier-display-content">
            <span className="atelier-clock-caption"><span className="atelier-live-point" aria-hidden="true" /> เวลาปัจจุบัน</span>
            <LiveClock />
            <p className="atelier-clock-explanation">เวลาจากอุปกรณ์ของคุณ</p>
          </div>

          <div className="atelier-display-footer" aria-hidden="true">
            <span className="atelier-tick-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>
            <span className="atelier-display-id">ATTENDANCE / V2</span>
          </div>
        </div>

        <div className="atelier-interaction">
          <div className="atelier-state" aria-live="polite" aria-atomic="true">
            <span className={`atelier-state-symbol atelier-state-${status}`} aria-hidden="true">
              {status === "not-started" ? <Icon name="clock" size={24} /> : <Icon name="check" size={25} />}
            </span>
            <div className="atelier-state-copy">
              <span>สถานะวันนี้</span>
              <strong>{statusLabel}</strong>
              <small>{statusHint}</small>
            </div>
          </div>

          <button type="button" className={`atelier-primary-action atelier-action-${status}`} onClick={handleAction}>
            <span className="atelier-action-label">{actionLabel}</span>
            <span className="atelier-action-arrow">
              <Icon name={status === "finished" ? "rotate" : "arrow"} size={23} />
            </span>
          </button>
          <p className="atelier-simulation-note">ทดลองกดได้ · ไม่มีการบันทึกข้อมูลจริง</p>
        </div>
      </section>

      <section className="atelier-day-summary" aria-label="สรุปเวลาเข้างานและเลิกงาน">
        <div className="atelier-summary-title">สรุปเวลาวันนี้ <span>ข้อมูลทดลอง</span></div>
        <div className="atelier-summary-steps">
          <div className="atelier-summary-step">
            <span className={`atelier-step-point${checkInAt ? " is-complete" : ""}`} aria-hidden="true" />
            <div>
              <span className="atelier-step-name">เข้างาน</span>
              <strong>{checkInAt ? shortTimeFormatter.format(checkInAt) : "--:--"}</strong>
            </div>
          </div>
          <div className="atelier-connecting-line" aria-hidden="true" />
          <div className="atelier-summary-step">
            <span className={`atelier-step-point${checkOutAt ? " is-complete" : ""}`} aria-hidden="true" />
            <div>
              <span className="atelier-step-name">เลิกงาน</span>
              <strong>{checkOutAt ? shortTimeFormatter.format(checkOutAt) : "--:--"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="atelier-location" aria-labelledby="atelier-location-title">
        <span className="atelier-location-icon"><Icon name="pin" size={23} /></span>
        <div className="atelier-location-content">
          <h2 id="atelier-location-title">สถานที่ทำงาน</h2>
          <p>ยังไม่ได้เปิดใช้การตรวจสอบตำแหน่ง GPS</p>
        </div>
        <span className="atelier-location-status">ยังไม่เชื่อมต่อ</span>
      </section>
    </div>
  );
}
