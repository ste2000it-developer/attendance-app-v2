import { useState } from "react";
import EmployeeManagerPreview from "./EmployeeManagerPreview";
import type { EmployeeRecord } from "./EmployeeManagerPreview";
import LeaveManagerPreview, { createDemoLeaveRequests } from "./LeaveManagerPreview";
import ReportManagerPreview from "./ReportManagerPreview";
import type { AdminLeaveRequest } from "./LeaveManagerPreview";
import "./AdminPreviewPage.css";
import "./AdminVisualRefresh.css";

const tabs = [
  { id: "overview", label: "ภาพรวม" },
  { id: "people", label: "พนักงาน" },
  { id: "leave", label: "คำขอลา" },
  { id: "report", label: "รายงาน" },
  { id: "settings", label: "ตั้งค่า" }
] as const;
type Tab = typeof tabs[number]["id"];

const screens: Record<Exclude<Tab,"overview">, { title: string; detail: string; icon: string }> = {
  people: { title: "จัดการพนักงาน", detail: "เพิ่มพนักงาน กำหนดแผนก ตำแหน่ง สิทธิ์ และข้อมูลบัตรพนักงาน", icon: "people" },
  leave: { title: "จัดการคำขอลา", detail: "อนุมัติคำขอ ดูประวัติการลา และส่งออกใบลาทั้งหมดเป็น Excel", icon: "calendar" },
  report: { title: "รายงานการทำงาน", detail: "สรุปเข้างาน ลา สาย และ OT รายเดือน พร้อมรายงานรายพนักงานและ Excel", icon: "chart" },
  settings: { title: "ตั้งค่าระบบ", detail: "กำหนดสถานที่ทำงาน วันหยุด และสิทธิ์ผู้ใช้งาน", icon: "settings" }
};
function AdminIcon({ name, size = 21 }: {name: string; size?: number}) {
  const paths: Record<string, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/></>,
    people: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Z"/><path d="M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15l2.5 2.5L16 12"/></>,
    chart: <><path d="M3 21h18M6 17v-6m6 6V5m6 12v-8" strokeWidth="2.5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.8 3.1a8.2 8.2 0 0 1 2.2 1.3L20 5l2 3.5-2.2 2.2a8 8 0 0 1 0 2.6L22 15.5 20 19l-3-1.4a8 8 0 0 1-2.2 1.3L14 22h-4l-.8-3.1A8 8 0 0 1 7 17.6L4 19l-2-3.5 2.2-2.2a8 8 0 0 1 0-2.6L2 8.5 4 5l3 1.4a8 8 0 0 1 2.2-1.3Z"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AdminPreviewPage() {
  const [active, setActive] = useState<Tab>(() => {
    const requested = new URLSearchParams(window.location.search).get("section");
    return tabs.some(tab => tab.id === requested) ? requested as Tab : "overview";
  });
  const [demoEmployees, setDemoEmployees] = useState<EmployeeRecord[]>([]);
  const [demoLeaveRequests, setDemoLeaveRequests] = useState<AdminLeaveRequest[]>(createDemoLeaveRequests);
  function navigate(next: Tab) {
    setActive(next);
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState(null, "", url);
  }
  const selected = active === "overview" ? null : screens[active];

  return (
    <div className="admin-preview-shell">
      <aside className="admin-preview-sidebar">
        <div className="admin-preview-brand">
          <span className="admin-preview-brand-icon"><AdminIcon name="overview" size={24}/></span>
          <div><strong>STE2000<span>.</span></strong><small>Admin Console · V2</small></div>
        </div>
        <p className="admin-preview-side-heading">การจัดการ</p>
        <nav className="admin-preview-nav" aria-label="เมนูแอดมิน">
          {tabs.map(t=>(
            <button key={t.id} type="button" className={active===t.id?"is-active":""}
              aria-current={active===t.id?"page":undefined} onClick={()=>navigate(t.id)}>
              <AdminIcon name={t.id}/>{t.label}
            </button>
          ))}
        </nav>
        <p className="admin-preview-side-note">ต้นแบบหน้าบ้านเท่านั้น<br/>ยังไม่มีข้อมูลหรือสิทธิ์แอดมินจริง</p>
      </aside>

      <main className="admin-preview-main">
        <header className="admin-preview-header">
          <div><span className="admin-preview-eyebrow">ADMIN / ATTENDANCE V2</span><h1>จัดการระบบ</h1></div>
          <a href="?preview=login" className="admin-preview-back">กลับหน้าเข้าสู่ระบบ <span aria-hidden="true">↗</span></a>
        </header>
        <div className="admin-preview-mobile-nav" role="navigation" aria-label="เมนูแอดมินบนมือถือ">
          {tabs.map(t=>(
            <button key={t.id} className={active===t.id?"is-active":""} type="button"
              aria-current={active===t.id?"page":undefined} onClick={()=>navigate(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="admin-preview-content">
          <div className="admin-preview-intro">
            <div><span className="admin-preview-kicker">{selected ? "ส่วนจัดการ" : "ภาพรวม"}</span>
              <h2>{selected?.title ?? "ภาพรวมระบบลงเวลางาน"}</h2>
              <p>{selected?.detail ?? "ติดตามการลงเวลางานและรายการสำคัญของพนักงานในหน้าจอเดียว"}</p>
            </div>
            <span className="admin-preview-tag">UI PREVIEW</span>
          </div>
          {active==="overview" ? (
            <>
              <div className="admin-preview-stat-grid">
                {[
                  ["พนักงานทั้งหมด", "people"], ["เข้างานวันนี้", "overview"], ["คำขอลารอดำเนินการ", "calendar"], ["OT วันนี้", "chart"]
                ].map(([title, icon])=>(
                  <div className="admin-preview-stat" key={title}>
                    <span className="admin-preview-stat-icon"><AdminIcon name={icon}/></span>
                    <span>{title}</span><strong>—</strong>
                    <small>รอเชื่อมข้อมูลจริง</small>
                  </div>
                ))}
              </div>
              <section className="admin-preview-panel">
                <div className="admin-preview-panel-head"><h3>งานจัดการหลัก</h3><p>เลือกเมนูเพื่อดูโครงสร้างหน้าจอต้นแบบ</p></div>
                <div className="admin-preview-shortcuts">
                  {(["people","leave","report","settings"] as const).map(id=>(
                    <button key={id} type="button" onClick={()=>navigate(id)}>
                      <span><AdminIcon name={id}/></span>
                      <strong>{screens[id].title}</strong>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : active === "people" ? (
            <EmployeeManagerPreview employees={demoEmployees} onChange={setDemoEmployees} />
          ) : active === "leave" ? (
            <LeaveManagerPreview requests={demoLeaveRequests} onChange={setDemoLeaveRequests} />
          ) : active === "report" ? (
            <ReportManagerPreview />
          ) : (
            <section className="admin-preview-panel admin-preview-empty">
              <span className="admin-preview-empty-icon"><AdminIcon name={active} size={30}/></span>
              <h3>{selected?.title}</h3>
              <p>พื้นที่จัดการส่วนนี้เตรียมไว้สำหรับข้อมูลจริง ขณะนี้ยังไม่ได้เชื่อม Firebase จึงไม่มีรายการให้แก้ไขหรืออนุมัติ</p>
              <span className="admin-preview-empty-footnote">ยังไม่มีการเปลี่ยนแปลงข้อมูลจริง</span>
            </section>
          )}
          <p className="admin-preview-disclaimer">เวอร์ชันต้นแบบ · ไม่มีการตรวจสิทธิ์แอดมินหรือเข้าถึงข้อมูลพนักงานจริง</p>
        </div>
      </main>
    </div>
  );
}
