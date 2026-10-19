import { useEffect, useState } from "react";
import "./HomePage.css";

type DemoStatus = "ready" | "working" | "finished";
type IconName = "arrow" | "pin" | "clock" | "reset" | "check";

const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});
const shortTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const shapes = {
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    reset: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>
  );
}

function LiveClock() {
  // Only this component updates once per second, keeping the rest of the UI stable.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const [hour, minute, second] = timeFormatter.format(now).split(":");
  return (
    <div className="daily-clock" aria-label={`เวลาปัจจุบัน ${timeFormatter.format(now)} นาฬิกา`}>
      <span>{hour}<span className="daily-clock-colon">:</span>{minute}</span>
      <span className="daily-clock-second">:{second}</span>
    </div>
  );
}

function TodayDate() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setDate(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  return <span className="daily-date">{thaiDateFormatter.format(date)}</span>;
}

export function HomePage() {
  // All actions are in-memory previews, never production clock-in/out.
  const [checkInAt, setCheckInAt] = useState<Date | null>(null);
  const [checkOutAt, setCheckOutAt] = useState<Date | null>(null);

  const status: DemoStatus = !checkInAt ? "ready" : !checkOutAt ? "working" : "finished";
  const statusText = status === "ready"
    ? "ยังไม่ได้เข้างาน"
    : status === "working" ? "กำลังทำงาน" : "เลิกงานแล้ว";
  const statusDescription = status === "ready"
    ? "พร้อมเริ่มบันทึกเวลาวันนี้"
    : status === "working" ? "ทดลองบันทึกเวลาเข้างานแล้ว" : "ทดลองบันทึกเวลาครบแล้ว";
  const buttonText = status === "ready"
    ? "ทดลองเข้างาน" : status === "working" ? "ทดลองเลิกงาน" : "เริ่มทดลองใหม่";

  function handleDemo() {
    if (status === "ready") {
      setCheckInAt(new Date());
    } else if (status === "working") {
      setCheckOutAt(new Date());
    } else {
      setCheckInAt(null);
      setCheckOutAt(null);
    }
  }

  return (
    <div className="daily-home">
      <header className="daily-intro">
        <div>
          <div className="daily-kicker"><span aria-hidden="true" /> ระบบบันทึกเวลาทำงาน</div>
          <h1>สวัสดีครับ<span className="daily-hi-dot" aria-hidden="true">.</span></h1>
          <p>เริ่มต้นวันทำงานอย่างง่าย ๆ</p>
        </div>
        <TodayDate />
      </header>

      <section className="daily-focus" aria-labelledby="daily-focus-title">
        <div className="daily-clock-area">
          <p className="daily-section-caption" id="daily-focus-title">เวลาปัจจุบัน</p>
          <LiveClock />
          <p className="daily-clock-support"><span className="daily-live-dot" aria-hidden="true" /> เวลาจากอุปกรณ์ของคุณ</p>
        </div>

        <div className="daily-action-area">
          <div className={`daily-state daily-state-${status}`} role="status" aria-live="polite" aria-atomic="true">
            <span className="daily-state-icon" aria-hidden="true">
              <Icon name={status === "ready" ? "clock" : "check"} size={24} />
            </span>
            <div className="daily-state-copy">
              <span>สถานะวันนี้</span>
              <strong>{statusText}</strong>
              <small>{statusDescription}</small>
            </div>
          </div>

          <button
            type="button"
            className={`daily-main-action daily-main-action-${status}`}
            onClick={handleDemo}
          >
            <span>{buttonText}</span>
            <span className="daily-action-icon">
              <Icon name={status === "finished" ? "reset" : "arrow"} size={24} />
            </span>
          </button>
          <p className="daily-demo-note">โหมดทดลอง · ไม่บันทึกข้อมูลจริง</p>
        </div>
      </section>

      <section className="daily-records" aria-labelledby="daily-records-title">
        <div className="daily-section-header">
          <div>
            <span className="daily-section-index">01 / TODAY</span>
            <h2 id="daily-records-title">สรุปเวลาวันนี้</h2>
          </div>
          <span className="daily-preview-label">ข้อมูลทดลอง</span>
        </div>

        <div className="daily-record-grid">
          <div className="daily-record">
            <span className={`daily-record-marker${checkInAt ? " is-complete" : ""}`} aria-hidden="true">
              <Icon name={checkInAt ? "check" : "clock"} size={20} />
            </span>
            <div className="daily-record-content">
              <span>เวลาเข้างาน</span>
              <strong>{checkInAt ? shortTimeFormatter.format(checkInAt) : "--:--"}</strong>
              <small>{checkInAt ? "ทดลองบันทึกแล้ว" : "ยังไม่มีข้อมูล"}</small>
            </div>
          </div>
          <div className="daily-record">
            <span className={`daily-record-marker${checkOutAt ? " is-complete" : ""}`} aria-hidden="true">
              <Icon name={checkOutAt ? "check" : "clock"} size={20} />
            </span>
            <div className="daily-record-content">
              <span>เวลาเลิกงาน</span>
              <strong>{checkOutAt ? shortTimeFormatter.format(checkOutAt) : "--:--"}</strong>
              <small>{checkOutAt ? "ทดลองบันทึกแล้ว" : "ยังไม่มีข้อมูล"}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="daily-place" aria-labelledby="daily-place-title">
        <span className="daily-place-icon"><Icon name="pin" size={25} /></span>
        <div className="daily-place-copy">
          <h2 id="daily-place-title">สถานที่ทำงาน</h2>
          <p>ระบบตรวจสอบตำแหน่ง GPS ยังไม่ได้เชื่อมต่อ</p>
        </div>
        <span className="daily-place-status">รอเชื่อมต่อ</span>
      </section>
    </div>
  );
}
