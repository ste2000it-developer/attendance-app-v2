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

/**
 * The friendly face deliberately follows the original concept: pale rounded
 * square, dark-blue faceplate, two cyan capsule eyes, a small smile and dot.
 * It is vector-only (no network image) and stays readable at small sizes.
 */
function CompanionFace({ status }: { status: DemoStatus }) {
  const smile = status === "ready" ? "M46 68 Q52 72 58 68"
    : status === "working" ? "M44 66 Q52 76 60 66" : "M43 65 Q52 77 61 65";

  return (
    <span className={`daily-companion-face daily-companion-${status}`} aria-hidden="true">
      <svg viewBox="0 0 104 104" width="104" height="104" fill="none" focusable="false">
        <rect width="104" height="104" rx="24" fill="#E8F2F9" />
        <rect x="12" y="10" width="80" height="84" rx="29" fill="#D5E8F5" />
        <rect x="20" y="21" width="64" height="62" rx="24" fill="#174563" />
        <g className="daily-companion-eyes">
          <rect x="32" y="41" width="12" height="20" rx="6" fill="#A5E1FA" />
          <rect x="60" y="41" width="12" height="20" rx="6" fill="#A5E1FA" />
        </g>
        <path d={smile} stroke="#A5E1FA" strokeWidth="2.7" strokeLinecap="round" />
        <circle cx="87" cy="18" r="7" fill="#47BFA9" stroke="#E8F2F9" strokeWidth="3" />
      </svg>
    </span>
  );
}

export function HomePage({ onOpenLeave }: { onOpenLeave: () => void }) {
  // All actions are in-memory previews, never production clock-in/out.
  const [checkInAt, setCheckInAt] = useState<Date | null>(null);
  const [checkOutAt, setCheckOutAt] = useState<Date | null>(null);
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperTopic, setHelperTopic] = useState<"attendance" | "gps" | null>(null);

  const status: DemoStatus = !checkInAt ? "ready" : !checkOutAt ? "working" : "finished";
  const statusText = status === "ready"
    ? "ยังไม่ได้เข้างาน"
    : status === "working" ? "กำลังทำงาน" : "เลิกงานแล้ว";
  const statusDescription = status === "ready"
    ? "พร้อมเริ่มบันทึกเวลาวันนี้"
    : status === "working" ? "ทดลองบันทึกเวลาเข้างานแล้ว" : "ทดลองบันทึกเวลาครบแล้ว";
  const buttonText = status === "ready"
    ? "ทดลองเข้างาน" : status === "working" ? "ทดลองเลิกงาน" : "เริ่มทดลองใหม่";

  const companionGreeting = status === "ready" ? "สวัสดีครับ!"
    : status === "working" ? "เริ่มงานแล้วครับ!" : "เรียบร้อยแล้วครับ!";
  const companionMessage = status === "ready"
    ? "วันนี้พร้อมเริ่มงานหรือยังครับ? ผมอยู่ตรงนี้ถ้าต้องการความช่วยเหลือ"
    : status === "working"
      ? "ทดลองเข้างานแล้วครับ เมื่อทำงานเสร็จ ลองกดเลิกงานได้เลย"
      : "ทดลองเลิกงานครบแล้วครับ ขอบคุณสำหรับวันนี้!";
  const helpMessage = helperTopic === "attendance"
    ? status === "ready"
      ? "กดปุ่มสีเขียว “ทดลองเข้างาน” ด้านล่างได้เลยครับ ข้อมูลจะไม่ถูกบันทึกจริง"
      : status === "working"
        ? "ตอนนี้อยู่ในสถานะทดลองทำงาน กดปุ่มสีส้มเพื่อทดลองเลิกงานได้ครับ"
        : "คุณทดลองครบแล้ว กด “เริ่มทดลองใหม่” เพื่อกลับไปจุดเริ่มต้นได้ครับ"
    : "ขณะนี้ Attendance V2 ยังไม่ได้เชื่อม GPS จึงยังไม่ตรวจสอบตำแหน่งจริงครับ";

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
        <div className="daily-welcome">
          <CompanionFace status={status} />
          <div className="daily-welcome-copy">
            <span className="daily-kicker">ผู้ช่วยของคุณ <span className="daily-assistant-demo">DEMO</span></span>
            <h1 aria-live="polite">{companionGreeting}</h1>
            <p aria-live="polite">{companionMessage}</p>
            <button
              type="button"
              className="daily-helper-toggle"
              aria-expanded={helperOpen}
              aria-controls="daily-helper-options"
              onClick={() => {
                setHelperOpen((open) => !open);
                setHelperTopic(null);
              }}
            >
              {helperOpen ? "ปิดคำแนะนำ" : "ให้ผมช่วยไหม?"}
              <span aria-hidden="true">{helperOpen ? "−" : "↗"}</span>
            </button>
          </div>
        </div>
        <TodayDate />
      </header>

      {helperOpen && (
        <section className="daily-helper-options" id="daily-helper-options" aria-label="คำแนะนำจากผู้ช่วย">
          <strong>อยากให้ช่วยเรื่องไหนครับ?</strong>
          <div className="daily-helper-actions">
            <button type="button" onClick={() => setHelperTopic("attendance")}>วิธีตอกบัตร</button>
            <button type="button" onClick={() => setHelperTopic("gps")}>ตำแหน่ง GPS</button>
            <button type="button" onClick={onOpenLeave}>ไปหน้าการลา <span aria-hidden="true">↗</span></button>
          </div>
          {helperTopic && <p className="daily-helper-response" role="status">{helpMessage}</p>}
          <p className="daily-helper-disclaimer">ผู้ช่วยเวอร์ชันทดลอง · แนะนำจากสถานะในหน้านี้ ยังไม่ใช่ AI สนทนา</p>
        </section>
      )}

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
