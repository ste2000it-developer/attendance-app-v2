import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exportLeaveWorkbook } from "./leaveWorkbook";
import "./LeaveManagerPreview.css";

type LeaveStatus = "pending" | "approved" | "rejected";
type LeaveType = "sick" | "annual" | "unpaid_personal" | "emergency" | "training" | "military" | "ordination" | "maternity" | "sterilization" | "other";
export type AdminLeaveRequest = {
  id: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  submittedDate: string;
  reason: string;
  attachment: string | null;
  status: LeaveStatus;
  decisionDate: string | null;
  decisionNote: string;
};

const leaveTypes: ReadonlyArray<{ value: LeaveType; label: string }> = [
  { value: "sick", label: "ลาป่วย" },
  { value: "annual", label: "ลาพักร้อนประจำปี" },
  { value: "unpaid_personal", label: "ลากิจโดยไม่รับค่าจ้าง" },
  { value: "emergency", label: "ลาฉุกเฉิน" },
  { value: "training", label: "ลาเพื่อฝึกอบรม/พัฒนาความรู้" },
  { value: "military", label: "ลารับราชการทหาร" },
  { value: "ordination", label: "ลาอุปสมบท" },
  { value: "maternity", label: "ลาคลอด" },
  { value: "sterilization", label: "ลาเพื่อทำหมัน" },
  { value: "other", label: "อื่น ๆ" }
];
const statusLabels: Record<LeaveStatus, string> = {
  pending: "รอพิจารณา", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ"
};
const typeLabel = (id: LeaveType) => leaveTypes.find(type => type.value === id)?.label ?? "—";
const formatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });
function dateOffset(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function formatDate(iso: string) {
  return formatter.format(new Date(iso + "T12:00:00"));
}
function daysBetween(from: string, to: string) {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2,m2-1,d2) - Date.UTC(y1,m1-1,d1)) / 86400000) + 1;
}
function Icon({ name, size = 20 }: { name:  "calendar" | "check" | "close" | "clock" | "file" | "arrow" | "users" | "reject" | "info"; size?: number }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    check: <path d="m5 12 4.5 4.5L19 7"/>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M13 3v5h5M8 13h8M8 17h6"/></>,
    arrow: <path d="m9 6 6 6-6 6"/>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Z"/><path d="M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/></>,
    reject: <><circle cx="12" cy="12" r="9"/><path d="m8.5 8.5 7 7m0-7-7 7"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

/** Clearly fictional demo records; never copied from V1 or Firebase. */
export function createDemoLeaveRequests(): AdminLeaveRequest[] {
  return [
    { id:"DEMO-L001", employeeCode:"DEMO-001", employeeName:"พนักงานตัวอย่าง 01", department:"ฝ่ายปฏิบัติการ", type:"annual",
      startDate:dateOffset(3), endDate:dateOffset(5), submittedDate:dateOffset(-2),
      reason:"ขอลาพักผ่อนตามสิทธิ์ประจำปี", attachment:null, status:"pending", decisionDate:null, decisionNote:"" },
    { id:"DEMO-L002", employeeCode:"DEMO-002", employeeName:"พนักงานตัวอย่าง 02", department:"ฝ่ายธุรการ", type:"sick",
      startDate:dateOffset(-1), endDate:dateOffset(0), submittedDate:dateOffset(-1),
      reason:"ขอลาพักรักษาตัวตามคำแนะนำของแพทย์", attachment:"ตัวอย่าง-ใบรับรองแพทย์.pdf", status:"pending", decisionDate:null, decisionNote:"" },
    { id:"DEMO-L003", employeeCode:"DEMO-003", employeeName:"พนักงานตัวอย่าง 03", department:"ฝ่ายบริการ", type:"training",
      startDate:dateOffset(7), endDate:dateOffset(7), submittedDate:dateOffset(-3),
      reason:"เข้าร่วมการอบรมพัฒนาความรู้ด้านการทำงาน", attachment:"ตัวอย่าง-หนังสืออบรม.pdf",
      status:"pending", decisionDate:null, decisionNote:"" },
    { id:"DEMO-L004", employeeCode:"DEMO-001", employeeName:"พนักงานตัวอย่าง 01", department:"ฝ่ายปฏิบัติการ", type:"emergency",
      startDate:dateOffset(-10), endDate:dateOffset(-10), submittedDate:dateOffset(-11),
      reason:"มีธุระจำเป็นเร่งด่วน", attachment:null, status:"approved",
      decisionDate:dateOffset(-11), decisionNote:"อนุมัติในข้อมูลตัวอย่าง" },
    { id:"DEMO-L005", employeeCode:"DEMO-004", employeeName:"พนักงานตัวอย่าง 04", department:"ฝ่ายบัญชี", type:"unpaid_personal",
      startDate:dateOffset(-6), endDate:dateOffset(-5), submittedDate:dateOffset(-9),
      reason:"ขอลาไปดำเนินธุระส่วนตัว", attachment:null, status:"rejected",
      decisionDate:dateOffset(-8), decisionNote:"ข้อมูลประกอบไม่เพียงพอ (ตัวอย่าง)" }
  ];
}

type Choice = "approve" | "reject" | null;
export default function LeaveManagerPreview({ requests, onChange }: {
  requests: AdminLeaveRequest[];
  onChange: (next: AdminLeaveRequest[]) => void;
}) {
  const [view, setView] = useState<"pending" | "history">("pending");
  const [exportError, setExportError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [feedback, setFeedback] = useState("");
  const dialogRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const pendingRows = requests.filter(item => item.status === "pending")
    .sort((a,b) => b.submittedDate.localeCompare(a.submittedDate) || a.id.localeCompare(b.id));
  const historyRows = requests.filter(item => item.status !== "pending")
    .sort((a,b) => (b.decisionDate ?? "").localeCompare(a.decisionDate ?? "") || a.id.localeCompare(b.id));
  const selected = requests.find(item => item.id === selectedId) ?? null;
  const rows = view === "pending" ? pendingRows : historyRows;
  function handleExport() {
    try {
      exportLeaveWorkbook(requests, typeLabel, statusLabels);
      setExportError("");
      setFeedback("ส่งออกไฟล์ Excel จากข้อมูลใบลาตัวอย่างทั้งหมด " + requests.length + " รายการแล้ว");
    } catch {
      setExportError("ไม่สามารถสร้างไฟล์ Excel ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
    }
  }

  function openDetail(item: AdminLeaveRequest, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setSelectedId(item.id); setChoice(null); setDecisionNote(""); setDecisionError("");
  }
  function closeDetail() {
    setSelectedId(null); setChoice(null); setDecisionNote(""); setDecisionError("");
  }
  function chooseDecision(next: Exclude<Choice,null>) {
    setChoice(next); setDecisionNote(""); setDecisionError("");
  }
  function confirmDecision() {
    if (!selected || selected.status !== "pending" || !choice) return;
    if (choice === "reject" && !decisionNote.trim()) {
      setDecisionError("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
      return;
    }
    const nextStatus: LeaveStatus = choice === "approve" ? "approved" : "rejected";
    onChange(requests.map(item => item.id === selected.id ? {
      ...item, status: nextStatus, decisionDate: dateOffset(0), decisionNote: decisionNote.trim()
    } : item));
    setFeedback((choice === "approve" ? "อนุมัติ" : "ไม่อนุมัติ") + "คำขอ " + selected.id + " ในตัวอย่างแล้ว (ยังไม่บันทึกจริง)");
    closeDetail();
  }
  useEffect(() => {
    if (!selectedId) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>(".leave-admin-close")?.focus({preventScroll:true});
    function keydown(event: KeyboardEvent) {
      if (!dialogRef.current?.contains(event.target as Node) || event.defaultPrevented) return;
      if (event.key === "Escape") { event.preventDefault(); closeDetail(); return; }
      if (event.key !== "Tab") return;
      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled])'
      ));
      if (!elements.length) return;
      if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault(); elements[elements.length-1].focus();
      } else if (!event.shiftKey && document.activeElement === elements[elements.length-1]) {
        event.preventDefault(); elements[0].focus();
      }
    }
    document.addEventListener("keydown",keydown);
    return () => {
      document.removeEventListener("keydown",keydown);
      document.body.style.overflow = oldOverflow;
      openerRef.current?.focus({preventScroll:true});
    };
  }, [selectedId]);

  return (
    <div className="leave-admin leave-simple">
      <header className="leave-simple-top">
        <div>
          <span className="leave-simple-eyebrow">LEAVE MANAGEMENT · UI PREVIEW</span>
          <h3>ใบลาพนักงาน</h3>
          <p>อนุมัติคำขอ ดูประวัติ และส่งออกใบลาทั้งหมดเป็น Excel</p>
        </div>
        <button type="button" className="leave-simple-export" onClick={handleExport} disabled={requests.length===0}>
          <Icon name="file" size={19}/> ส่งออก Excel
        </button>
      </header>
      <div className="leave-simple-note"><Icon name="info" size={16}/> ข้อมูลตัวอย่างสำหรับทดสอบเท่านั้น ไม่เชื่อม Firebase และเมื่อรีเฟรชหน้าข้อมูลจะกลับเป็นค่าเริ่มต้น</div>
      {feedback && <div className="leave-admin-feedback" role="status"><Icon name="check" size={18}/><span>{feedback}</span>
        <button type="button" aria-label="ปิดข้อความ" onClick={()=>setFeedback("")}><Icon name="close" size={16}/></button></div>}
      {exportError && <p className="leave-simple-error" role="alert">{exportError}</p>}

      <section className="leave-simple-section" aria-label="รายการและประวัติใบลา">
        <nav className="leave-simple-tabs" aria-label="เลือกดูคำขอหรือประวัติ">
          <button type="button" className={view==="pending"?"is-active":""} aria-current={view==="pending"?"page":undefined}
            onClick={()=>setView("pending")}>
            <Icon name="clock" size={18}/> รออนุมัติ <span>{pendingRows.length}</span>
          </button>
          <button type="button" className={view==="history"?"is-active":""} aria-current={view==="history"?"page":undefined}
            onClick={()=>setView("history")}>
            <Icon name="calendar" size={18}/> ประวัติการลา <span>{historyRows.length}</span>
          </button>
        </nav>
        <div className="leave-simple-heading">
          <div><h4>{view==="pending"?"คำขอที่รอพิจารณา":"ประวัติการลา"}</h4>
            <p>{view==="pending"?"กดดูรายละเอียดเพื่ออนุมัติหรือไม่อนุมัติ":"รายการที่พิจารณาแล้ว ทั้งอนุมัติและไม่อนุมัติ"}</p></div>
          <span>{rows.length} รายการ</span>
        </div>
        {rows.length===0 ? (
          <div className="leave-admin-empty">
            <span><Icon name={view==="pending"?"check":"calendar"} size={27}/></span>
            <strong>{view==="pending"?"ไม่มีคำขอที่รออนุมัติ":"ยังไม่มีประวัติการลา"}</strong>
            <p>{view==="pending"?"คำขอที่พิจารณาแล้วจะไปอยู่ในแท็บประวัติการลา":"เมื่ออนุมัติหรือไม่อนุมัติใบลา รายการจะปรากฏที่นี่"}</p>
          </div>
        ) : (
          <>
            <div className="leave-simple-table-scroll">
              <table className="leave-simple-table">
                <thead><tr><th scope="col">พนักงาน</th><th scope="col">ประเภท / วันที่ลา</th>
                  <th scope="col">สถานะ</th><th scope="col"><span className="sr-only">เปิดรายละเอียด</span></th></tr></thead>
                <tbody>{rows.map(item=>(
                  <tr key={item.id}>
                    <td><strong>{item.employeeName}</strong><small>{item.employeeCode} · {item.id}</small></td>
                    <td><strong>{typeLabel(item.type)}</strong>
                      <small>{formatDate(item.startDate)}{item.startDate!==item.endDate?" – "+formatDate(item.endDate):""} · {daysBetween(item.startDate,item.endDate)} วัน</small></td>
                    <td><span className={"leave-admin-status is-"+item.status}>{statusLabels[item.status]}</span>
                      {view==="history" && <small>พิจารณา {item.decisionDate ? formatDate(item.decisionDate) : "—"}</small>}</td>
                    <td><button type="button" className="leave-simple-open" onClick={event=>openDetail(item,event.currentTarget)}>
                      รายละเอียด <Icon name="arrow" size={16}/></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="leave-simple-cards">
              {rows.map(item=>(
                <article className="leave-simple-card" key={item.id}>
                  <div className="leave-simple-card-top"><div><strong>{item.employeeName}</strong><small>{item.employeeCode} · {item.id}</small></div>
                    <span className={"leave-admin-status is-"+item.status}>{statusLabels[item.status]}</span></div>
                  <div className="leave-simple-card-meta">
                    <div className="leave-simple-type-row">
                      <strong>{typeLabel(item.type)}</strong>
                      <span className="leave-simple-day-pill">{daysBetween(item.startDate,item.endDate)} วัน</span>
                    </div>
                    <div className="leave-simple-dates">
                      <Icon name="calendar" size={16}/>
                      <span>{formatDate(item.startDate)}{item.startDate!==item.endDate?" – "+formatDate(item.endDate):""}</span>
                    </div>
                    {view==="history" && <small className="leave-simple-decided">พิจารณาเมื่อ {item.decisionDate ? formatDate(item.decisionDate):"—"}</small>}
                  </div>
                  <button type="button" className="leave-simple-open" aria-label={"ดูรายละเอียดคำขอของ "+item.employeeName}
                    onClick={event=>openDetail(item,event.currentTarget)}>
                    ดูรายละเอียดคำขอ <Icon name="arrow" size={17}/></button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {selected && createPortal(
        <div className="leave-admin-backdrop" role="presentation" onMouseDown={event=>{
          if (event.target===event.currentTarget) closeDetail();
        }}>
          <section className="leave-admin-modal" role="dialog" aria-modal="true"
            aria-labelledby="leave-admin-modal-title" aria-describedby="leave-admin-modal-desc" ref={dialogRef}>
            <header className="leave-admin-modal-head">
              <div><span>คำขอ {selected.id} · ข้อมูลทดลอง</span><h2 id="leave-admin-modal-title">รายละเอียดคำขอลา</h2></div>
              <button type="button" className="leave-admin-close" aria-label="ปิดรายละเอียดคำขอ"
                onClick={closeDetail}><Icon name="close"/></button>
            </header>
            <p className="leave-admin-modal-demo" id="leave-admin-modal-desc"><Icon name="info" size={17}/> ข้อมูลตัวอย่างเท่านั้น การอนุมัติ/ปฏิเสธในหน้านี้ไม่มีผลต่อบัญชีจริง</p>
            <div className="leave-admin-modal-body">
              <div className="leave-admin-modal-person">
                <div className="leave-admin-avatar"><Icon name="users" size={24}/></div>
                <div><strong>{selected.employeeName}</strong><span>{selected.employeeCode} · {selected.department}</span></div>
                <span className={"leave-admin-status is-"+selected.status}>{statusLabels[selected.status]}</span>
              </div>
              <dl className="leave-admin-detail-grid">
                <div><dt>ประเภทการลา</dt><dd>{typeLabel(selected.type)}</dd></div>
                <div><dt>วันที่ส่งคำขอ</dt><dd>{formatDate(selected.submittedDate)}</dd></div>
                <div><dt>วันเริ่มลา</dt><dd>{formatDate(selected.startDate)}</dd></div>
                <div><dt>วันสิ้นสุด</dt><dd>{formatDate(selected.endDate)}</dd></div>
                <div><dt>จำนวนวัน</dt><dd>{daysBetween(selected.startDate,selected.endDate)} วัน</dd></div>
              </dl>
              <div className="leave-admin-reason"><h3>เหตุผลการลา</h3><p>{selected.reason}</p></div>
              <div className="leave-admin-attachment"><div><Icon name="file" size={19}/><span>เอกสารแนบ</span></div>
                {selected.attachment ? <p>{selected.attachment} <small>· ชื่อไฟล์ตัวอย่าง ไม่มีไฟล์ให้เปิด</small></p>
                  : <p>ไม่มีเอกสารแนบ</p>}
              </div>
              {selected.status !== "pending" && <div className="leave-admin-history">
                <h3>ประวัติการพิจารณา</h3>
                <p><span className={"leave-admin-status is-"+selected.status}>{statusLabels[selected.status]}</span> เมื่อ {selected.decisionDate ? formatDate(selected.decisionDate) : "—"}</p>
                <div><small>หมายเหตุ</small><strong>{selected.decisionNote || "ไม่ได้ระบุหมายเหตุ"}</strong></div>
              </div>}
              {choice && selected.status==="pending" && <div className="leave-admin-decision">
                <h3>{choice==="approve"?"ยืนยันการอนุมัติ":"ยืนยันการไม่อนุมัติ"}</h3>
                <p>{choice==="approve"?"คุณสามารถเพิ่มหมายเหตุประกอบการอนุมัติได้":"กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอนี้"}</p>
                <label htmlFor="leave-admin-decision-note">หมายเหตุ {choice==="reject"?"*":"(ไม่บังคับ)"}</label>
                <textarea id="leave-admin-decision-note" maxLength={500} rows={3}
                  required={choice==="reject"} value={decisionNote}
                  placeholder={choice==="reject"?"ระบุเหตุผลที่ไม่อนุมัติ":"หมายเหตุเพิ่มเติม (ถ้ามี)"}
                  onChange={event=>{setDecisionNote(event.target.value);setDecisionError("");}}
                  />
                {decisionError && <span className="leave-admin-inline-error" role="alert">{decisionError}</span>}
              </div>}
            </div>
            <footer className="leave-admin-modal-actions">
              {selected.status!=="pending"
                ? <button type="button" className="leave-admin-secondary" onClick={closeDetail}>ปิด</button>
                : choice
                  ? <>
                    <button type="button" className="leave-admin-secondary" onClick={()=>{setChoice(null);setDecisionNote("");setDecisionError("");}}>ย้อนกลับ</button>
                    <button type="button" className={"leave-admin-primary"+(choice==="reject"?" is-reject":"")} onClick={confirmDecision}>
                      <Icon name={choice==="approve"?"check":"reject"} size={18}/> ยืนยัน{choice==="approve"?"อนุมัติ":"ไม่อนุมัติ"} (ทดลอง)
                    </button>
                  </>
                  : <>
                    <button type="button" className="leave-admin-secondary" onClick={closeDetail}>ปิด</button>
                    <button type="button" className="leave-admin-reject" onClick={()=>chooseDecision("reject")}><Icon name="reject" size={18}/> ไม่อนุมัติ</button>
                    <button type="button" className="leave-admin-primary" onClick={()=>chooseDecision("approve")}><Icon name="check" size={18}/> อนุมัติ</button>
                  </>}
            </footer>
          </section>
        </div>,document.body
      )}
    </div>
  );
}
