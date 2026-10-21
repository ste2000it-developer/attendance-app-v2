import { useMemo, useState } from "react";
import {
  createDemoAttendanceMonth,currentReportMonth,reportDateLabel,reportMonthLabel,
  reportStatusLabels,shiftReportMonth
} from "./reportDemoData";
import { exportAttendanceReportWorkbook } from "./reportWorkbook";
import "./ReportManagerPreview.css";
import ReportYearlyPreview from "./ReportYearlyPreview";
import ReportDetailDialog from "./ReportDetailDialog";
import "./ReportYearlyPreview.css";

function ReportIcon({name,size=19}:{name:"left"|"right"|"download"|"search"|"check"|"calendar"|"clock"|"users"|"close"|"file"|"arrow";size?:number}){
  const paths={
    left:<path d="m15 5-7 7 7 7"/>,
    right:<path d="m9 5 7 7-7 7"/>,
    download:<><path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/></>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
    check:<path d="m5 12 4 4L19 7"/>,
    calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Z"/><path d="M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/></>,
    close:<path d="M5 5 19 19M19 5 5 19"/>,
    file:<><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M13 3v5h5"/></>,
    arrow:<path d="m9 6 6 6-6 6"/>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function hours(value:number):string {
  return value.toLocaleString("th-TH",{maximumFractionDigits:1});
}
const cards=[
  {key:"present",label:"เข้างาน",suffix:"วัน-คน",description:"รวมวันที่มาทำงาน (รวมสาย)",icon:"check"},
  {key:"absent",label:"ขาดงาน",suffix:"วัน-คน",description:"รายการขาดงานในข้อมูลตัวอย่าง",icon:"users"},
  {key:"leave",label:"ลางาน",suffix:"วัน-คน",description:"นับรายการลาจำลอง",icon:"calendar"},
  {key:"late",label:"มาสาย",suffix:"ครั้ง",description:"รวมอยู่ในยอดเข้างานด้วย",icon:"clock"},
  {key:"otHours",label:"OT รวม",suffix:"ชม.",description:"ชั่วโมง OT จำลอง ไม่ใช้คิดเงิน",icon:"clock"}
] as const;

function ReportMonthlyPreview() {
  const [month,setMonth]=useState(currentReportMonth);
  const [query,setQuery]=useState("");
  const [selectedCode,setSelectedCode]=useState<string|null>(null);
  const [exportError,setExportError]=useState("");
  const data=useMemo(()=>createDemoAttendanceMonth(month),[month]);
  const visible=data.employees.filter(person=>
    [person.name,person.code,person.department].some(text=>
      text.toLocaleLowerCase("th-TH").includes(query.trim().toLocaleLowerCase("th-TH"))
    )
  );
  const selected=data.employees.find(person=>person.code===selectedCode)||null;
  const nextDisabled=month>=currentReportMonth();
  const oldest=shiftReportMonth(currentReportMonth(),-11);
  const previousDisabled=month<=oldest;
  function changeMonth(delta:number){
    if((delta>0&&nextDisabled)||(delta<0&&previousDisabled))return;
    setMonth(old=>shiftReportMonth(old,delta));
    setSelectedCode(null);
    setExportError("");
  }
  function exportExcel(){
    try{
      exportAttendanceReportWorkbook(data);
      setExportError("");
    }catch{
      setExportError("สร้างไฟล์ Excel ไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  return <div className="report-v2">
    <div className="report-v2-top">
      <div className="report-v2-period">
        <span>ประจำเดือน</span>
        <div className="report-v2-period-nav">
          <button type="button" onClick={()=>changeMonth(-1)} disabled={previousDisabled} aria-label="เดือนก่อนหน้า">
            <ReportIcon name="left" size={17}/>
          </button>
          <strong>{reportMonthLabel(month)}</strong>
          <button type="button" onClick={()=>changeMonth(1)} disabled={nextDisabled} aria-label="เดือนถัดไป">
            <ReportIcon name="right" size={17}/>
          </button>
        </div>
      </div>
      <button className="report-v2-export" type="button" onClick={exportExcel}>
        <ReportIcon name="download" size={19}/> ส่งออก Excel
      </button>
    </div>
    <div className="report-v2-note">
      <ReportIcon name="file" size={17}/>
      <span><strong>ข้อมูลทดลองทั้งหมด</strong> — สร้างตัวอย่าง 8 พนักงาน เฉพาะวันจันทร์–ศุกร์
        {month===currentReportMonth()?" ถึงวันนี้":""} ยังไม่หักวันหยุดบริษัท ไม่เชื่อมข้อมูลเข้างาน/การลาจริงหรือ Firebase และตัวเลข OT ยังไม่ใช่ยอดจ่ายเงิน</span>
    </div>
    {exportError&&<p className="report-v2-error" role="alert">{exportError}</p>}
    <div className="report-v2-stats">
      {cards.map(card=><div className={"report-v2-stat report-v2-stat-"+card.key} key={card.key}>
        <div className="report-v2-stat-top">
          <span>{card.label}</span><span className="report-v2-stat-symbol"><ReportIcon name={card.icon}/></span>
        </div>
        <div className="report-v2-stat-number">{hours(data.total[card.key])}<span>{card.suffix}</span></div>
        <small>{card.description}</small>
      </div>)}
    </div>
    <section className="report-v2-section" aria-labelledby="report-v2-people-title">
      <div className="report-v2-heading">
        <div><h3 id="report-v2-people-title">รายงานรายพนักงาน</h3>
          <p>สรุปตามวันทำงานที่จำลองในเดือนนี้ · {data.scheduledDates.length} วัน</p></div>
        <span className="report-v2-count">{visible.length} / {data.employees.length} คน</span>
      </div>
      <label className="report-v2-search">
        <ReportIcon name="search" size={17}/>
        <span className="sr-only">ค้นหาพนักงาน</span>
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="ค้นหาชื่อ รหัส หรือแผนก..." />
      </label>
      {visible.length===0?<div className="report-v2-empty">ไม่พบพนักงานที่ตรงกับคำค้นหา</div>:<>
        <div className="report-v2-table-wrap">
          <table className="report-v2-table">
            <thead><tr><th scope="col">พนักงาน</th><th scope="col">เข้างาน</th>
              <th scope="col">ขาด</th><th scope="col">ลา</th><th scope="col">สาย</th>
              <th scope="col">OT (ชม.)</th><th scope="col"><span className="sr-only">รายละเอียด</span></th></tr></thead>
            <tbody>{visible.map(person=><tr key={person.code}>
              <td><strong>{person.name}</strong><span>{person.code} · {person.department}</span></td>
              <td className="report-v2-number positive">{person.present}</td>
              <td className="report-v2-number">{person.absent}</td>
              <td className="report-v2-number">{person.leave}</td>
              <td className="report-v2-number">{person.late}</td>
              <td className="report-v2-number ot">{hours(person.otHours)}</td>
              <td><button type="button" className="report-v2-open"
                aria-haspopup="dialog" onClick={()=>setSelectedCode(person.code)}>
                รายวัน <ReportIcon name="arrow" size={15}/></button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="report-v2-person-cards">
          {visible.map(person=><article className="report-v2-person-card" key={person.code}>
            <div className="report-v2-person-head"><div><strong>{person.name}</strong>
              <small>{person.code} · {person.department}</small></div>
              <button type="button" onClick={()=>setSelectedCode(person.code)}
                aria-haspopup="dialog">รายวัน <ReportIcon name="arrow" size={15}/></button></div>
            <div className="report-v2-person-metrics">
              <span>เข้างาน <strong>{person.present}</strong></span>
              <span>ขาด <strong>{person.absent}</strong></span>
              <span>ลา <strong>{person.leave}</strong></span>
              <span>สาย <strong>{person.late}</strong></span>
              <span>OT <strong>{hours(person.otHours)} ชม.</strong></span>
            </div>
          </article>)}
        </div>
      </>}
      <p className="report-v2-footnote">เข้างานรวมรายการมาสายแล้ว (ไม่บวกซ้ำ) · 1 รายการ = พนักงาน 1 คนต่อ 1 วันทำงานจำลอง</p>
    </section>
    {selected&&<ReportDetailDialog titleId="report-v2-detail-title" onClose={()=>setSelectedCode(null)}>
      <div className="report-v2-detail-heading">
        <div><span>รายละเอียดการลงเวลา</span><h3 id="report-v2-detail-title">{selected.name}</h3>
          <p>{selected.code} · {reportMonthLabel(month)}</p></div>
        <button className="report-v2-detail-close" type="button" onClick={()=>setSelectedCode(null)} aria-label="ปิดรายละเอียด"><ReportIcon name="close" size={18}/></button>
      </div>
      <div className="report-v2-detail-scroll">
        <table className="report-v2-detail-table">
          <thead><tr><th scope="col">วันที่</th><th scope="col">สถานะ</th><th scope="col">เข้างาน</th>
            <th scope="col">ออกงาน</th><th scope="col">สาย (นาที)</th><th scope="col">OT (ชม.)</th></tr></thead>
          <tbody>{selected.days.length?selected.days.map(day=><tr key={day.date}>
            <td>{reportDateLabel(day.date)}</td>
            <td><span className={"report-v2-status report-v2-status-"+day.status}>{reportStatusLabels[day.status]}</span></td>
            <td>{day.checkIn||"—"}</td><td>{day.checkOut||"—"}</td>
            <td>{day.lateMinutes||"—"}</td><td>{day.otHours?hours(day.otHours):"—"}</td>
          </tr>):<tr><td colSpan={6} className="report-v2-no-data">เดือนนี้ยังไม่มีวันทำงานในข้อมูลทดลอง</td></tr>}</tbody>
        </table>
      </div>
      <p className="report-v2-detail-footnote">เวลาทั้งหมดเป็นข้อมูลจำลองเพื่อดูหน้าจอ ไม่ใช่หลักฐานการลงเวลาหรือคำนวณค่าจ้าง</p>
    </ReportDetailDialog>}
  </div>;
}


/** Keep the existing monthly report intact and switch only the visible view. */
export default function ReportManagerPreview(){
  const [mode,setMode]=useState<"month"|"year">("month");
  return <>
    <div className="report-v2-mode-tabs" role="group" aria-label="เลือกชนิดรายงาน">
      <button type="button" className={mode==="month"?"is-active":""}
        aria-pressed={mode==="month"} onClick={()=>setMode("month")}>รายเดือน</button>
      <button type="button" className={mode==="year"?"is-active":""}
        aria-pressed={mode==="year"} onClick={()=>setMode("year")}>รายปี</button>
    </div>
    {mode==="month"?<ReportMonthlyPreview/>:<ReportYearlyPreview/>}
  </>;
}
