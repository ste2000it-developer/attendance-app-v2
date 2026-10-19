import { useEffect, useState } from "react";
import "./HomePage.css";

type DemoStatus = "not-started" | "working" | "finished";
type IconName = "arrow" | "pin" | "clock" | "rotate" | "check";

const thaiDate = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});
const shortTime = new Intl.DateTimeFormat("en-GB", {
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

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths = {
    arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    rotate: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">{paths[name]}</svg>
  );
}

function LiveClock() {
  // Update only this component; don't redraw the whole Home screen every second.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const [hour, minute, second] = digitalTime.format(now).split(":");

  return (
    <div className="focus-clock" aria-label={`เวลาปัจจุบัน ${digitalTime.format(now)}`}>
      <span>{hour}:{minute}</span><span className="focus-clock-seconds">:{second}</span>
    </div>
  );
}

export function HomePage() {
  // Visual demo only: no GPS, Firebase, local storage or attendance writes.
  const [clockInAt, setClockInAt] = useState<Date | null>(null);
  const [clockOutAt, setClockOutAt] = useState<Date | null>(null);
  const status: DemoStatus = !clockInAt ? "not-started" : !clockOutAt ? "working" : "finished";
  const statusLabel = status === "not-started"
    ? "ยังไม่ได้เข้างาน" : status === "working" ? "กำลังทำงาน" : "เลิกงานแล้ว";
  const actionLabel = status === "not-started"
    ? "ทดลองเข้างาน" : status === "working" ? "ทดลองเลิกงาน" : "เริ่มทดลองใหม่";

  function handleAction() {
    if (status === "not-started") setClockInAt(new Date());
    else if (status === "working") setClockOutAt(new Date());
    else {
      setClockInAt(null);
      setClockOutAt(null);
    }
  }

  return (
    <div className="focus-home">
      <header className="focus-intro">
        <div>
          <span className="focus-intro-kicker">ATTENDANCE · เวอร์ชันทดลอง</span>
          <h1>สวัสดีครับ</h1>
          <p>พร้อมเริ่มวันทำงานหรือยัง?</p>
        </div>
        <span className="focus-date">{thaiDate.format(new Date())}</span>
      </header>

      <section className="focus-stage" aria-labelledby="focus-stage-title">
        <div className="focus-stage-top">
          <h2 id="focus-stage-title">บันทึกเวลาทำงาน</h2>
          <span className="focus-demo-mark">DEMO</span>
        </div>

        <div className="focus-center">
          <span className="focus-time-label">
            <span className="focus-live-dot" aria-hidden="true" />
            เวลาปัจจุบัน
          </span>
          <LiveClock />
          <p className="focus-clock-note">เวลาอ้างอิงจากอุปกรณ์ของคุณ</p>

          <div className={`focus-status focus-status-${status}`} aria-live="polite" aria-atomic="true">
            <span className="focus-status-dot" aria-hidden="true" />
            <strong>{statusLabel}</strong>
          </div>

          <button
            type="button"
            className={`focus-action focus-action-${status}`}
            onClick={handleAction}
          >
            <span className="focus-action-icon">
              <Icon name={status === "finished" ? "rotate" : status === "working" ? "check" : "arrow"} size={23} />
            </span>
            <span>{actionLabel}</span>
          </button>
          <p className="focus-action-note">กดทดลองได้ · ไม่บันทึกข้อมูลจริง</p>
        </div>

        <div className="focus-time-summary" aria-label="เวลาตอกบัตรที่ทดลอง">
          <div>
            <span>เวลาเข้างาน</span>
            <strong>{clockInAt ? shortTime.format(clockInAt) : "--:--"}</strong>
          </div>
          <span className="focus-summary-divider" aria-hidden="true" />
          <div>
            <span>เวลาเลิกงาน</span>
            <strong>{clockOutAt ? shortTime.format(clockOutAt) : "--:--"}</strong>
          </div>
        </div>
      </section>

      <section className="focus-location" aria-labelledby="focus-location-title">
        <span className="focus-location-icon"><Icon name="pin" size={24} /></span>
        <div>
          <h2 id="focus-location-title">สถานที่ทำงาน</h2>
          <p>ยังไม่ได้เปิดใช้การตรวจสอบตำแหน่ง GPS</p>
        </div>
        <span className="focus-location-aside">รอเชื่อมต่อ</span>
      </section>
    </div>
  );
}
