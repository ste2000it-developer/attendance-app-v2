import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./LeavePage.css";

type LeaveStep = 0 | 1 | 2 | 3 | 4 | 5;
const leaveTypes = [
  { id: "sick", label: "ลาป่วย", hint: "กรณีเจ็บป่วยหรือพักรักษาตัว", icon: "heart", advance: false, note: false, featured: true },
  { id: "annual", label: "ลาพักร้อนประจำปี", hint: "วันพักผ่อนประจำปี", icon: "sun", advance: true, note: false, featured: true },
  { id: "unpaid_personal", label: "ลากิจโดยไม่รับค่าจ้าง", hint: "ธุระส่วนตัวโดยไม่รับค่าจ้าง", icon: "briefcase", advance: true, note: false, featured: true },
  { id: "emergency", label: "ลาฉุกเฉิน", hint: "กรณีจำเป็นเร่งด่วน", icon: "alert", advance: false, note: true, featured: true },
  { id: "training", label: "ลาเพื่อฝึกอบรม/พัฒนาความรู้", hint: "หลักสูตรหรือการพัฒนาทักษะ", icon: "book", advance: true, note: false, featured: false },
  { id: "military", label: "ลารับราชการทหาร", hint: "ตามภาระหน้าที่รับราชการทหาร", icon: "shield", advance: true, note: false, featured: false },
  { id: "ordination", label: "ลาอุปสมบท", hint: "ตามประเพณีทางศาสนา", icon: "sun", advance: true, note: false, featured: false },
  { id: "maternity", label: "ลาคลอด", hint: "ตามสิทธิ์ลาคลอด", icon: "woman", advance: true, note: false, featured: false },
  { id: "sterilization", label: "ลาเพื่อทำหมัน", hint: "เข้ารับการรักษาทางการแพทย์", icon: "medical", advance: true, note: false, featured: false },
  { id: "other", label: "อื่น ๆ", hint: "ประเภทที่ไม่อยู่ในรายการ", icon: "more", advance: false, note: true, featured: false }
] as const;

type LeaveType = typeof leaveTypes[number]["id"];
type LeaveChoice = typeof leaveTypes[number];
type DemoSummary = { type: string; start: string; end: string; days: number; note: string; attachmentName: string };

function Symbol({ name, size = 21 }: { name: string; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    heart: <path d="M20.4 5.6a5.1 5.1 0 0 0-7.2 0L12 6.8l-1.2-1.2a5.1 5.1 0 0 0-7.2 7.2L12 21l8.4-8.2a5.1 5.1 0 0 0 0-7.2Z" />,
    woman: <path fill="currentColor" stroke="none" d="M10.5 22v-5.5H7.5l2.55-8.2q.2-.625.75-.962t1.2-.338q.65 0 1.2.338t.75.962l2.55 8.2H13.5V22h-3Zm.213-16.885q-.538-.536-.538-1.288t.536-1.289q.535-.538 1.287-.538t1.29.535q.537.536.537 1.288t-.535 1.29q-.536.537-1.288.537t-1.289-.535Z" />,
    medical: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>,
    alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
    book: <><path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v15" /></>,
    shield: <><path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z" /><path d="m9 12 2 2 4-4" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    file: <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7Z" /><path d="M13 2v7h7M8 13h8M8 17h6" /></>,
    check: <path d="m5 12 4 4 10-10" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    close: <path d="M5 5l14 14M19 5 5 19" />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shapes[name] || shapes.calendar}
    </svg>
  );
}

function Chevron({ left = false }: { left?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {left ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
  </svg>;
}

function localToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function inclusiveDays(start: string, end: string) {
  if (!start || !end || end < start) return 0;
  const toUtc = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(end) - toUtc(start)) / 86400000) + 1;
}

const dateFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });
function showDate(value: string) {
  return value ? dateFormatter.format(new Date(value + "T12:00:00")) : "ยังไม่เลือก";
}

/* Dates are selected only via calendar; DD/MM/YYYY values are still validated. */
function dmyToIso(text: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return "";
  const [day, month, year] = text.split("/").map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return "";
  const actual = new Date(year, month - 1, day);
  if (actual.getFullYear() !== year || actual.getMonth() !== month - 1 || actual.getDate() !== day) return "";
  return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}
function dateToDmy(date: Date): string {
  return [String(date.getDate()).padStart(2, "0"), String(date.getMonth() + 1).padStart(2, "0"), String(date.getFullYear())].join("/");
}
function dateToIso(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
const monthName = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { month: "long", year: "numeric" });
const weekdays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

const steps = ["ประเภทการลา", "ช่วงวันที่", "รายละเอียด", "ตรวจสอบ"];

export default function LeavePage() {
  const [step, setStep] = useState<LeaveStep>(0);
  const [type, setType] = useState<LeaveType | "">("");
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [editingDate, setEditingDate] = useState<"start" | "end">("start");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarDialogRef = useRef<HTMLElement | null>(null);
  const calendarOpenerRef = useRef<HTMLButtonElement | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const start = dmyToIso(startText);
  const end = dmyToIso(endText);
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [latestPreview, setLatestPreview] = useState<DemoSummary | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  const chosen: LeaveChoice | undefined = leaveTypes.find((item) => item.id === type);
  const days = inclusiveDays(start, end);

  useEffect(() => {
    if (step !== 0) {
      titleRef.current?.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);


  function openCalendar(field: "start" | "end", opener: HTMLButtonElement) {
    calendarOpenerRef.current = opener;
    setEditingDate(field);
    const selectedIso = dmyToIso(field === "start" ? startText : endText);
    const chosenDate = selectedIso ? new Date(selectedIso + "T12:00:00") : new Date();
    setVisibleMonth(new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1));
    setCalendarOpen(true);
  }

  function selectCalendarDate(date: Date) {
    if (editingDate === "start") setStartText(dateToDmy(date));
    else setEndText(dateToDmy(date));
    setError("");
    setCalendarOpen(false);
  }

  // A real dialog: keyboard focus enters the popup, remains within it,
  // closes with Escape, and returns to the calendar button.
  useEffect(() => {
    if (!calendarOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    calendarDialogRef.current?.querySelector<HTMLButtonElement>(".leave-calendar-close")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setCalendarOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(calendarDialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault(); controls[controls.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
        event.preventDefault(); controls[0].focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      calendarOpenerRef.current?.focus({ preventScroll: true });
    };
  }, [calendarOpen]);

  function begin() {
    setType("");
    setStartText("");
    setEndText("");
    setEditingDate("start");
    setCalendarOpen(false);
    setVisibleMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setNote("");
    setAttachment(null);
    setFileKey((previous) => previous + 1);
    setError("");
    setStep(1);
  }

  function back() {
    setError("");
    setStep((previous) => Math.max(0, previous - 1) as LeaveStep);
  }

  function advance() {
    setError("");
    if (step === 1) {
      if (!chosen) { setError("กรุณาเลือกประเภทการลา"); return; }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!start || !end) { setError("กรุณาระบุวันที่ให้ถูกต้องในรูปแบบ DD/MM/YYYY เช่น 20/10/2026"); return; }
      if (end < start) { setError("วันสิ้นสุดต้องไม่ก่อนวันเริ่มลา"); return; }
      if (chosen?.advance && start <= localToday()) {
        setError("ประเภทนี้ต้องยื่นลาล่วงหน้าอย่างน้อย 1 วัน");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (chosen?.note && !note.trim()) {
        setError("การลาประเภทนี้ต้องระบุหมายเหตุ");
        return;
      }
      if (attachment && attachment.size > 2 * 1024 * 1024) {
        setError("เอกสารแนบต้องไม่เกิน 2 MB");
        return;
      }
      setStep(4);
    }
  }

  function confirmPreview() {
    if (!chosen || !start || !end || days <= 0) return;
    setLatestPreview({
      type: chosen.label, start, end, days, note: note.trim(),
      attachmentName: attachment?.name || ""
    });
    setStep(5);
  }


  return (
    <div className="page-content leave-v2 leave-journey">
      {step === 0 ? (
        <>
          <header className="leave-landing-heading">
            <h1>การลา</h1>
            <p>ยื่นคำขอและดูสถานะการลา</p>
          </header>

          <section className="leave-entry" aria-label="เริ่มยื่นใบลา">
            <button type="button" className="leave-primary leave-entry-cta" onClick={begin}>
              <span className="leave-entry-action-label">
                <span className="leave-entry-action-icon"><Symbol name="calendar" size={24} /></span>
                ยื่นใบลาใหม่
              </span>
              <Chevron />
            </button>
            <p className="leave-entry-step-note">เลือกประเภทและกรอกใบลาได้ทีละขั้นตอน</p>
          </section>

          <section className="leave-history" aria-labelledby="leave-history-title">
            <div className="leave-history-heading">
              <div>
                <h2 id="leave-history-title">ประวัติการลา</h2>
                <p>ดูคำขอและสถานะการอนุมัติ</p>
              </div>
            </div>
            {latestPreview && (
              <div className="leave-latest-demo">
                <span className="leave-latest-icon"><Symbol name="file" size={21} /></span>
                <div>
                  <strong>ตัวอย่างล่าสุด · {latestPreview.type}</strong>
                  <span>{showDate(latestPreview.start)} – {showDate(latestPreview.end)} · {latestPreview.days} วัน</span>
                </div>
                <span className="leave-demo-flag">ยังไม่ส่ง</span>
              </div>
            )}
            <div className="leave-history-empty">
              <span className="leave-history-empty-icon"><Symbol name="history" size={25} /></span>
              <strong>ยังไม่มีประวัติการลา</strong>
              <p>เมื่อเชื่อมระบบแล้ว รายการจะปรากฏที่นี่</p>
            </div>
          </section>
          <p className="leave-footnote"><Symbol name="info" size={16} /> เวอร์ชันทดลอง · ยังไม่เชื่อมบัญชีและระบบอนุมัติ</p>
        </>
      ) : step === 5 ? (
        <section className="leave-success" aria-labelledby="leave-success-title">
          <span className="leave-success-symbol"><Symbol name="check" size={36} /></span>
          <span className="leave-step-overline">เรียบร้อยแล้ว · DEMO</span>
          <h1 id="leave-success-title" className="leave-wizard-title" ref={titleRef} tabIndex={-1}>ตรวจสอบข้อมูลครบแล้ว</h1>
          <p>คุณกรอกตัวอย่างใบลาครบทุกขั้นตอนแล้ว แต่ <strong>ยังไม่มีการส่งหรือบันทึกคำขอจริง</strong></p>
          <div className="leave-success-recap">
            <span>ประเภทการลา</span><strong>{chosen?.label}</strong>
            <span>ช่วงวันที่</span><strong>{showDate(start)} – {showDate(end)}</strong>
            <span>รวม</span><strong>{days} วัน (นับรวมวันต้นและวันสุดท้าย)</strong>
          </div>
          <button type="button" className="leave-primary" onClick={() => setStep(0)}>
            กลับหน้าการลา <Chevron />
          </button>
          <button type="button" className="leave-text-button" onClick={begin}>ทดลองกรอกใบลาใหม่</button>
        </section>
      ) : (
        <div className="leave-wizard">
          <header className="leave-wizard-head">
            <button className="leave-back" type="button" onClick={back}>
              <Chevron left /> <span>{step === 1 ? "กลับหน้าการลา" : "ย้อนกลับ"}</span>
            </button>
            <span className="leave-wizard-counter">ขั้นตอน {step} / 4</span>
          </header>
          <div className="leave-progress" aria-label={"ขั้นตอนที่ " + step + " จากทั้งหมด 4 ขั้นตอน"}>
            {steps.map((item, index) => (
              <span key={item} className={index < step ? "is-complete" : ""} />
            ))}
          </div>
          <div className="leave-wizard-intro">
            <span className="leave-step-overline">{steps[step - 1]}</span>
            <h1 className="leave-wizard-title" tabIndex={-1} ref={titleRef}>
              {step === 1 ? "คุณต้องการลาประเภทไหน?"
                : step === 2 ? "ต้องการลาวันไหน?"
                : step === 3 ? "มีรายละเอียดเพิ่มเติมไหม?"
                : "ตรวจสอบใบลาของคุณ"}
            </h1>
            <p>{step === 1 ? "เลือกประเภทการลาได้ 1 รายการ"
              : step === 2 ? "เลือกวันเริ่มลาและวันสิ้นสุด"
              : step === 3 ? "แนบรายละเอียดเพิ่มเติมตามประเภทการลา"
              : "ตรวจทานข้อมูลอีกครั้งก่อนจบการทดลอง"}</p>
          </div>


          {step === 1 && (
            <div className="leave-type-stage">
              <div className="leave-type-list" role="group" aria-label="เลือกประเภทการลา">
                {leaveTypes.map((item) => (
                  <button key={item.id} type="button"
                    className={"leave-type-option" + (type === item.id ? " is-selected" : "")}
                    aria-pressed={type === item.id} title={item.hint}
                    onClick={() => { setType(item.id); setError(""); }}>
                    <span className="leave-type-symbol"><Symbol name={item.icon} size={25} /></span>
                    <span className="leave-type-text"><strong>{item.label}</strong></span>
                    {type === item.id && <span className="leave-type-check"><Symbol name="check" size={13} /></span>}
                  </button>
                ))}
              </div>
              {chosen && (
                <div className="leave-rule-hint">
                  <Symbol name="info" size={19} />
                  <span>{chosen.advance ? "ประเภทนี้ต้องยื่นลาล่วงหน้าอย่างน้อย 1 วัน" : "ประเภทนี้ยื่นลาในวันเดียวกันได้"}</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="leave-calendar-stage">
              <div className="leave-date-intro">
                <span className="leave-mini-caption"><Symbol name="calendar" size={18} /> {chosen?.label}</span>
                <p>แตะช่องวันที่เพื่อเปิดปฏิทิน แล้วเลือกวันได้ทันที</p>
              </div>
              <div className="leave-date-pair">
                {(["start", "end"] as const).map((field) => {
                  const value = field === "start" ? startText : endText;
                  const resolved = field === "start" ? start : end;
                  const label = field === "start" ? "วันเริ่มลา" : "วันสิ้นสุดลา";
                  return (
                    <button key={field} type="button"
                      className="leave-date-input-card leave-date-picker-trigger"
                      aria-label={label + " " + (value || "ยังไม่เลือกวันที่") + " แตะเพื่อเปิดปฏิทิน"}
                      aria-haspopup="dialog"
                      aria-expanded={calendarOpen && editingDate === field}
                      aria-controls={calendarOpen && editingDate === field ? "leave-calendar-dialog" : undefined}
                      onClick={(event) => openCalendar(field, event.currentTarget)}>
                      <span className="leave-date-picker-label">{label}</span>
                      <span className="leave-date-picker-value-row">
                        <strong className={!value ? "is-placeholder" : ""}>{value || "DD/MM/YYYY"}</strong>
                        <span className="leave-date-picker-icon"><Symbol name="calendar" size={22} /></span>
                      </span>
                      <span className="leave-date-picker-detail">{resolved ? showDate(resolved) : "แตะเพื่อเลือกวันที่"}</span>
                    </button>
                  );
                })}
              </div>
              <p className="leave-dmy-help">รูปแบบ DD/MM/YYYY · วัน/เดือน/ปี ค.ศ.</p>
              <div className="leave-calendar-total">
                <span>จำนวนวันที่เลือก</span>
                <strong>{days} <small>วัน</small></strong>
                <small>{days ? "นับรวมวันเริ่มและวันสิ้นสุด" : "ระบุวันที่ทั้งสองช่อง"}</small>
              </div>
              <div className="leave-rule-hint">
                <Symbol name="info" size={19} />
                <span>{chosen?.advance ? "ต้องยื่นลาล่วงหน้าอย่างน้อย 1 วัน" : "ยื่นลาในวันเดียวกันได้"} · เดโมยังไม่ตรวจวันหยุดบริษัท</span>
              </div>
              {calendarOpen && (
                <div className="leave-calendar-backdrop" role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setCalendarOpen(false);
                  }}>
                  <section className="leave-custom-calendar" ref={calendarDialogRef} id="leave-calendar-dialog"
                    role="dialog" aria-modal="true" aria-labelledby="leave-calendar-dialog-title"
                    aria-describedby="leave-calendar-dialog-desc" tabIndex={-1}>
                    <div className="leave-calendar-grip" aria-hidden="true" />
                    <div className="leave-calendar-dialog-heading">
                      <div>
                        <span>เลือก{editingDate === "start" ? "วันเริ่มลา" : "วันสิ้นสุดลา"}</span>
                        <h2 id="leave-calendar-dialog-title">เลือกวันที่</h2>
                      </div>
                      <button type="button" className="leave-calendar-close" aria-label="ปิดปฏิทิน"
                        onClick={() => setCalendarOpen(false)}><Symbol name="close" size={20} /></button>
                    </div>
                    <p className="leave-calendar-dialog-hint" id="leave-calendar-dialog-desc">แตะวันที่ที่ต้องการ เลือกแล้วปฏิทินจะปิดอัตโนมัติ</p>
                    <div className="leave-month-bar">
                      <strong>{monthName.format(visibleMonth)}</strong>
                      <div className="leave-month-buttons">
                        <button type="button" aria-label="เดือนก่อนหน้า"
                          onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><Chevron left /></button>
                        <button type="button" aria-label="เดือนถัดไป"
                          onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><Chevron /></button>
                      </div>
                    </div>
                    <div className="leave-weekdays" aria-hidden="true">
                      {weekdays.map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="leave-month-days">
                      {[
                        ...Array.from({ length: (new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay() + 6) % 7 }, () => null),
                        ...Array.from({ length: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate() }, (_, i) =>
                          new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), i + 1))
                      ].map((date, index) => {
                        if (!date) return <span key={"empty-" + index} className="leave-month-empty" />;
                        const iso = dateToIso(date);
                        const selected = iso === start || iso === end;
                        const between = Boolean(start && end && iso > start && iso < end);
                        return (
                          <button type="button" key={iso}
                            className={"leave-day" + (selected ? " is-selected" : "") + (between ? " is-between" : "") + (iso === localToday() ? " is-today" : "")}
                            aria-label={showDate(iso)} aria-pressed={selected}
                            onClick={() => selectCalendarDate(date)}>{date.getDate()}</button>
                        );
                      })}
                    </div>
                    <div className="leave-calendar-footer">
                      <button type="button" onClick={() => selectCalendarDate(new Date())}>เลือกวันนี้</button>
                      <span>วันที่แสดงแบบ DD/MM/YYYY</span>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="leave-step-card">
              <div className="leave-mini-caption"><Symbol name="file" size={19} /> {chosen?.label}</div>
              <label className="leave-field" htmlFor="leave-note">
                หมายเหตุ {chosen?.note ? <span className="leave-required">จำเป็นต้องกรอก</span> : <span className="leave-optional">ไม่บังคับ</span>}
                <textarea id="leave-note" rows={4} value={note}
                  onChange={(event) => { setNote(event.target.value); setError(""); }}
                  placeholder={chosen?.note ? "ระบุสาเหตุการลาโดยสรุป" : "เพิ่มรายละเอียด (ถ้ามี)"}
                  maxLength={500} />
              </label>
              <label className="leave-field" htmlFor="leave-attachment">แนบเอกสาร <span className="leave-optional">ไม่บังคับ</span>
                <span className="leave-upload">
                  <Symbol name="plus" size={19} />
                  <span>{attachment ? attachment.name : "เลือกไฟล์แนบ"}</span>
                </span>
                <input key={fileKey} id="leave-attachment" className="leave-upload-input"
                  type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => {
                    setAttachment(event.target.files?.[0] || null);
                    setError("");
                  }} />
              </label>
              <p className="leave-input-note">รองรับ JPG, PNG, PDF ขนาดไม่เกิน 2 MB · เดโมจะไม่อัปโหลดไฟล์</p>
              {attachment && (
                <button type="button" className="leave-remove-file" onClick={() => {
                  setAttachment(null); setFileKey((previous) => previous + 1); setError("");
                }}>นำไฟล์ออก</button>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="leave-review">
              <div className="leave-review-card">
                <div className="leave-review-top">
                  <span className="leave-review-mark"><Symbol name="file" size={24} /></span>
                  <div><small>สรุปคำขอลา</small><strong>{chosen?.label}</strong></div>
                  <span className="leave-review-status">ตัวอย่าง</span>
                </div>
                <dl>
                  <div><dt>วันเริ่มลา</dt><dd>{showDate(start)}</dd></div>
                  <div><dt>วันสิ้นสุดลา</dt><dd>{showDate(end)}</dd></div>
                  <div><dt>จำนวนวัน</dt><dd>{days} วัน</dd></div>
                  <div><dt>หมายเหตุ</dt><dd>{note.trim() || "ไม่ได้ระบุ"}</dd></div>
                  <div><dt>เอกสารแนบ</dt><dd>{attachment?.name || "ไม่ได้แนบ"}</dd></div>
                </dl>
              </div>
              <div className="leave-rule-hint"><Symbol name="info" size={19} /><span>นี่เป็นตัวอย่างเพื่อทดสอบ UI ยังไม่มีการส่งให้หัวหน้าหรือบันทึกข้อมูลจริง</span></div>
              <button type="button" className="leave-edit-link" onClick={() => { setError(""); setStep(1); }}>เปลี่ยนประเภทการลาและแก้ไขข้อมูล</button>
            </div>
          )}

          {error && <p role="alert" className="leave-wizard-error">{error}</p>}
          <footer className="leave-wizard-footer">
            <button type="button" className="leave-primary" disabled={step === 1 && !chosen}
              onClick={step === 4 ? confirmPreview : advance}>
              {step === 4 ? "ยืนยันตัวอย่าง" : "ดำเนินการต่อ"} <Chevron />
            </button>
            <span>{step === 4 ? "ไม่มีการส่งข้อมูลจริง" : "คุณสามารถย้อนกลับไปแก้ไขได้"}</span>
          </footer>
        </div>
      )}
    </div>
  );
}
