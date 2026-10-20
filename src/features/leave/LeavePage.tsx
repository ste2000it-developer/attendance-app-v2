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
  { id: "maternity", label: "ลาคลอด", hint: "ตามสิทธิ์ลาคลอด", icon: "heart", advance: true, note: false, featured: false },
  { id: "sterilization", label: "ลาเพื่อทำหมัน", hint: "เข้ารับการรักษาทางการแพทย์", icon: "heart", advance: true, note: false, featured: false },
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

/* Browser-independent DD/MM/YYYY entry, with strict calendar-day validation. */
function dmyMask(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
}
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

  function begin() {
    setType("");
    setStartText("");
    setEndText("");
    setEditingDate("start");
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
          <header className="page-heading leave-landing-heading">
            <div>
              <span className="eyebrow">EMPLOYEE / LEAVE</span>
              <h1>การลา</h1>
              <p>จัดการวันลาได้ง่าย ๆ ในไม่กี่ขั้นตอน</p>
            </div>
            <span className="page-demo-tag">ตัวอย่าง UI</span>
          </header>

          <section className="leave-entry" aria-labelledby="leave-entry-title">
            <div className="leave-entry-top">
              <span className="leave-entry-symbol"><Symbol name="calendar" size={27} /></span>
              <span className="leave-entry-tag">ยื่นคำขอใหม่</span>
            </div>
            <h2 id="leave-entry-title">ต้องการยื่นใบลา?</h2>
            <p>ตอบคำถามทีละขั้น เลือกประเภทและวันลาได้โดยไม่ต้องกรอกฟอร์มยาว ๆ</p>
            <button type="button" className="leave-primary leave-entry-cta" onClick={begin}>
              ยื่นใบลาใหม่ <Chevron />
            </button>
            <span className="leave-entry-step-note">เพียง 4 ขั้นตอน · ย้อนกลับมาแก้ไขได้</span>
          </section>

          <section className="leave-history" aria-labelledby="leave-history-title">
            <div className="leave-history-heading">
              <div>
                <h2 id="leave-history-title">ประวัติการลา</h2>
                <p>รายการคำขอและสถานะการอนุมัติ</p>
              </div>
              <span className="leave-history-count">0 รายการจริง</span>
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
              <span className="leave-history-empty-icon"><Symbol name="history" size={27} /></span>
              <strong>ยังไม่มีประวัติการลาจริง</strong>
              <p>เมื่อเชื่อมต่อระบบแล้ว คำขอและผลการอนุมัติจะแสดงที่นี่</p>
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
              <section className="leave-date-display">
                <div className="leave-mini-caption"><Symbol name="calendar" size={19} /> {chosen?.label}</div>
                <h2>เลือกช่วงวันลา</h2>
                <p>พิมพ์วันที่แบบ วัน/เดือน/ปี หรือแตะเลือกจากปฏิทินด้านล่าง</p>
                <div className="leave-date-pair">
                  {(["start", "end"] as const).map((field) => {
                    const value = field === "start" ? startText : endText;
                    const resolved = field === "start" ? start : end;
                    const label = field === "start" ? "วันเริ่มลา" : "วันสิ้นสุดลา";
                    return (
                      <div key={field} className={"leave-date-input-card" + (editingDate === field ? " is-active" : "")}>
                        <label htmlFor={"leave-" + field + "-dmy"}>{label}</label>
                        <div className="leave-date-input-line">
                          <input id={"leave-" + field + "-dmy"} type="text" inputMode="numeric"
                            autoComplete="off" maxLength={10} placeholder="DD/MM/YYYY"
                            aria-describedby="leave-date-instructions" value={value}
                            onFocus={() => setEditingDate(field)}
                            onChange={(event) => {
                              (field === "start" ? setStartText : setEndText)(dmyMask(event.target.value));
                              setEditingDate(field); setError("");
                            }} />
                          <button type="button" aria-label={"เลือก" + label + "จากปฏิทิน"} onClick={() => setEditingDate(field)}>
                            <Symbol name="calendar" size={20} />
                          </button>
                        </div>
                        <span>{resolved ? showDate(resolved) : "เลือกจากปฏิทินได้"}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="leave-dmy-help" id="leave-date-instructions">บังคับ DD/MM/YYYY · เช่น 20/10/2026 (ปี ค.ศ.)</p>
              </section>
              <section className="leave-custom-calendar" aria-label="เลือกวันจากปฏิทิน">
                <div className="leave-month-bar">
                  <div>
                    <span>กำลังเลือก{editingDate === "start" ? "วันเริ่มลา" : "วันสิ้นสุดลา"}</span>
                    <strong>{monthName.format(visibleMonth)}</strong>
                  </div>
                  <div className="leave-month-buttons">
                    <button type="button" aria-label="เดือนก่อนหน้า"
                      onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}><Chevron left /></button>
                    <button type="button" aria-label="เดือนถัดไป"
                      onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}><Chevron /></button>
                  </div>
                </div>
                <div className="leave-weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
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
                        onClick={() => {
                          if (editingDate === "start") { setStartText(dateToDmy(date)); setEditingDate("end"); }
                          else setEndText(dateToDmy(date));
                          setError("");
                        }}>{date.getDate()}</button>
                    );
                  })}
                </div>
                <div className="leave-calendar-footer">
                  <button type="button" onClick={() => {
                    const today = new Date();
                    if (editingDate === "start") { setStartText(dateToDmy(today)); setEditingDate("end"); }
                    else setEndText(dateToDmy(today));
                    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    setError("");
                  }}>เลือกวันนี้</button>
                  <span>แตะวันที่เพื่อเลือกอัตโนมัติ</span>
                </div>
              </section>
              <div className="leave-calendar-total">
                <span>จำนวนวันที่เลือก</span>
                <strong>{days} <small>วัน</small></strong>
                <small>{days ? "นับรวมวันแรกและวันสุดท้าย" : "เลือกวันเริ่มและสิ้นสุด"}</small>
              </div>
              <div className="leave-rule-hint">
                <Symbol name="info" size={19} />
                <span>{chosen?.advance ? "ต้องยื่นลาล่วงหน้าอย่างน้อย 1 วัน" : "ยื่นลาในวันเดียวกันได้"} · เดโมยังไม่เช็กวันหยุดบริษัท</span>
              </div>
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
