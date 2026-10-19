import { useEffect, useRef, useState } from "react";
import "./HomePage.css";
import { GuideIllustration } from "./GuideIllustration";
import type { GuideTopic } from "./GuideIllustration";

type DemoStatus = "ready" | "working" | "finished";
type IconName = "arrow" | "pin" | "clock" | "reset" | "check" | "close" | "calendar";

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
    check: <path d="m5 12 4.5 4.5L19 7" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>
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
  const [helperTopic, setHelperTopic] = useState<GuideTopic | null>(null);
  const helperDialogRef = useRef<HTMLElement | null>(null);
  const helperOpenerRef = useRef<HTMLButtonElement | null>(null);

  // An accessible modal: focus enters the dialog, stays inside it, and
  // returns to the opener. Escape and the backdrop both close it.
  useEffect(() => {
    if (!helperOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    helperDialogRef.current?.querySelector<HTMLButtonElement>(".daily-sheet-close")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setHelperOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const elements = Array.from(
        helperDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      helperOpenerRef.current?.focus();
    };
  }, [helperOpen]);

  // When a guide is opened or dismissed, put keyboard focus on its new controls.
  useEffect(() => {
    if (!helperOpen) return;
    const selector = helperTopic ? ".daily-guide-back" : ".daily-sheet-options button";
    helperDialogRef.current?.querySelector<HTMLButtonElement>(selector)?.focus();
  }, [helperTopic]);

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
  const guideTitle = helperTopic === "attendance" ? "วิธีตอกบัตร"
    : helperTopic === "gps" ? "เปิดตำแหน่ง GPS" : "วิธีไปหน้าการลา";
  const guideDescription = helperTopic === "attendance"
    ? status === "ready"
      ? "แตะปุ่มสีเขียวเพื่อทดลองเข้างาน แล้วใช้ปุ่มสีส้มเพื่อทดลองเลิกงานครับ"
      : status === "working"
        ? "เมื่อทำงานเสร็จ แตะปุ่มสีส้มเพื่อทดลองเลิกงานได้เลยครับ"
        : "ลองกด “เริ่มทดลองใหม่” เพื่อดูขั้นตอนอีกครั้งได้ครับ"
    : helperTopic === "gps"
      ? "เปิดตำแหน่งในเครื่อง และอนุญาตให้เบราว์เซอร์เข้าถึงตำแหน่งครับ"
      : "แตะเมนู “การลา” ที่แถบด้านล่างเพื่อเปิดหน้าการลาครับ";

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
          <button
            type="button"
            className="daily-assistant-avatar-button"
            aria-label="เปิดผู้ช่วยของคุณ"
            aria-haspopup="dialog"
            aria-expanded={helperOpen}
            aria-controls="daily-helper-dialog"
            onClick={(event) => {
              helperOpenerRef.current = event.currentTarget;
              setHelperTopic(null);
              setHelperOpen(true);
            }}
          >
            <CompanionFace status={status} />
          </button>
          <div className="daily-welcome-copy">
            <span className="daily-kicker">ผู้ช่วยของคุณ <span className="daily-assistant-demo">DEMO</span></span>
            <h1 aria-live="polite">{companionGreeting}</h1>
            <p aria-live="polite">{companionMessage}</p>
            <button
              type="button"
              className="daily-helper-toggle"
              aria-haspopup="dialog"
              aria-expanded={helperOpen}
              aria-controls="daily-helper-dialog"
              onClick={(event) => {
                helperOpenerRef.current = event.currentTarget;
                setHelperTopic(null);
                setHelperOpen(true);
              }}
            >
              ให้ผมช่วยไหม?
              <Icon name="arrow" size={17} />
            </button>
          </div>
        </div>
        <TodayDate />
      </header>

      {helperOpen && (
        <div
          className="daily-sheet-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHelperOpen(false);
          }}
        >
          <section
            ref={helperDialogRef}
            className="daily-helper-sheet"
            id="daily-helper-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-sheet-title"
            aria-describedby="daily-sheet-description"
            tabIndex={-1}
          >
            <div className="daily-sheet-grip" aria-hidden="true" />
            <header className="daily-sheet-head">
              <div className="daily-sheet-identity">
                <span className="daily-sheet-avatar"><CompanionFace status={status} /></span>
                <div>
                  <span className="daily-sheet-eyebrow">ผู้ช่วยประจำแอป · DEMO</span>
                  <h2 id="daily-sheet-title">{helperTopic ? guideTitle : "มีอะไรให้ผมช่วยไหมครับ?"}</h2>
                </div>
              </div>
              <button
                type="button"
                className="daily-sheet-close"
                aria-label="ปิดผู้ช่วย"
                onClick={() => setHelperOpen(false)}
              >
                <Icon name="close" size={22} />
              </button>
            </header>
            <p className="daily-sheet-description" id="daily-sheet-description">
              {helperTopic ? "ดูจุดที่ทำเครื่องหมายไว้ในภาพได้เลยครับ" : "เลือกสิ่งที่ต้องการได้เลยครับ"}
            </p>
            {helperTopic ? (
              <div className="daily-guide-detail">
                <div className="daily-guide-image">
                  <GuideIllustration topic={helperTopic} status={status} />
                  <span className="daily-guide-image-label">ภาพจำลอง</span>
                </div>
                <p className="daily-guide-caption">{guideDescription}</p>
                {helperTopic === "gps" && (
                  <p className="daily-guide-warning">หมายเหตุ: GPS ใน V2 ยังไม่ได้เชื่อมต่อจริง</p>
                )}
                {helperTopic === "leave" && (
                  <div className="daily-guide-leave-actions">
                    <p className="daily-guide-warning">หน้าการลายังเป็นตัวอย่าง UI ไม่ได้ส่งคำขอจริง</p>
                    <button
                      type="button"
                      className="daily-guide-leave-button"
                      onClick={() => {
                        setHelperOpen(false);
                        onOpenLeave();
                      }}
                    >
                      ไปหน้าการลา <Icon name="arrow" size={19} />
                    </button>
                  </div>
                )}
                <button type="button" className="daily-guide-back" onClick={() => setHelperTopic(null)}>
                  <span aria-hidden="true">←</span> กลับไปเลือกหัวข้อ
                </button>
              </div>
            ) : (
              <div className="daily-sheet-options">
                <button type="button" onClick={() => setHelperTopic("attendance")}>
                  <span className="daily-sheet-option-icon"><Icon name="clock" size={21} /></span>
                  <span>วิธีตอกบัตร</span>
                  <Icon name="arrow" size={19} />
                </button>
                <button type="button" onClick={() => setHelperTopic("gps")}>
                  <span className="daily-sheet-option-icon"><Icon name="pin" size={21} /></span>
                  <span>แก้ปัญหา GPS</span>
                  <Icon name="arrow" size={19} />
                </button>
                <button type="button" onClick={() => setHelperTopic("leave")}>
                  <span className="daily-sheet-option-icon"><Icon name="calendar" size={21} /></span>
                  <span>ช่วยเรื่องการลา</span>
                  <Icon name="arrow" size={19} />
                </button>
              </div>
            )}
            <p className="daily-sheet-footnote">ผู้ช่วยเวอร์ชันทดลอง · ยังไม่ใช่ AI สนทนาและยังไม่เชื่อมข้อมูลจริง</p>
          </section>
        </div>
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
