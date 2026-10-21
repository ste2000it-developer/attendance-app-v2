import {useMemo,useState} from "react";
import {createDemoAttendanceYear,currentReportYear} from "./reportAnnualData";
import {exportAnnualReportWorkbook} from "./reportWorkbook";
import ReportDetailDialog from "./ReportDetailDialog";
import "./ReportYearlyPreview.css";

function YearIcon({name,size=17}:{name:"left"|"right"|"download"|"search"|"close"|"arrow";size?:number}) {
  const paths={
    left:<path d="m15 5-7 7 7 7"/>,
    right:<path d="m9 5 7 7-7 7"/>,
    download:<><path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/></>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
    close:<path d="M5 5 19 19M19 5 5 19"/>,
    arrow:<path d="m9 6 6 6-6 6"/>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const totals=[
  {key:"present",label:"เข้างาน",suffix:"วัน-คน",hint:"รวมวันที่มาสายแล้ว"},
  {key:"absent",label:"ขาดงาน",suffix:"วัน-คน",hint:"จากวันทำงานจำลอง"},
  {key:"leave",label:"ลางาน",suffix:"วัน-คน",hint:"ไม่เชื่อมใบลาจริง"},
  {key:"late",label:"มาสาย",suffix:"ครั้ง",hint:"นับอยู่ในวันเข้างาน"},
  {key:"otHours",label:"OT รวม",suffix:"ชม.",hint:"ชั่วโมงสมมติ"}
] as const;
const digits=(number:number)=>number.toLocaleString("th-TH",{maximumFractionDigits:1});
const shortMonth=(month:string)=>new Intl.DateTimeFormat("th-TH",{month:"short"}).format(
  new Date(Number(month.slice(0,4)),Number(month.slice(5,7))-1,15)
);

export default function ReportYearlyPreview(){
  const [year,setYear]=useState(currentReportYear);
  const [search,setSearch]=useState("");
  const [selectedCode,setSelectedCode]=useState<string|null>(null);
  const [error,setError]=useState("");
  const data=useMemo(()=>createDemoAttendanceYear(year),[year]);
  const earliest=currentReportYear()-4;
  const latest=currentReportYear();
  const visible=data.employees.filter(person=>
    [person.name,person.code,person.department].some(v=>
      v.toLocaleLowerCase("th-TH").includes(search.trim().toLocaleLowerCase("th-TH"))
    )
  );
  const selected=data.employees.find(person=>person.code===selectedCode)??null;
  function moveYear(change:number){
    const target=year+change;
    if(target<earliest||target>latest)return;
    setYear(target);
    setSelectedCode(null);
    setError("");
  }
  function exportExcel(){
    try{
      exportAnnualReportWorkbook(data);
      setError("");
    }catch{
      setError("ไม่สามารถสร้าง Excel รายปีได้ กรุณาลองอีกครั้ง");
    }
  }
  return <div className="report-v2 report-yearly">
    <div className="report-v2-top">
      <div className="report-v2-period">
        <span>สรุปประจำปี</span>
        <div className="report-v2-period-nav">
          <button type="button" aria-label="ปีก่อนหน้า" disabled={year<=earliest} onClick={()=>moveYear(-1)}><YearIcon name="left"/></button>
          <strong>พ.ศ. {year+543}</strong>
          <button type="button" aria-label="ปีถัดไป" disabled={year>=latest} onClick={()=>moveYear(1)}><YearIcon name="right"/></button>
        </div>
      </div>
      <button type="button" className="report-v2-export" onClick={exportExcel}>
        <YearIcon name="download" size={19}/> ส่งออก Excel รายปี
      </button>
    </div>
    <div className="report-v2-note">
      <span><strong>ข้อมูลทดลองรายปี</strong> — รวมจากรายเดือน {data.includedMonths} เดือน
        {year===currentReportYear()?" (ถึงวันนี้; ไม่รวมเดือนในอนาคต)":""}
        {" "}สำหรับพนักงานตัวอย่าง {data.employees.length} คน เฉพาะวันจันทร์–ศุกร์ ไม่หักวันหยุดบริษัท ไม่ดึง Firebase หรือใบลาจริง และ OT ไม่ใช่ยอดจ่ายเงิน</span>
    </div>
    {error&&<p className="report-v2-error" role="alert">{error}</p>}
    <div className="report-v2-stats">
      {totals.map(stat=><div className={"report-v2-stat report-v2-stat-"+stat.key} key={stat.key}>
        <div className="report-v2-stat-top"><span>{stat.label}</span><span className="report-yearly-stat-mark" aria-hidden="true"/></div>
        <div className="report-v2-stat-number">{digits(data.total[stat.key])}<span>{stat.suffix}</span></div>
        <small>{stat.hint}</small>
      </div>)}
    </div>
    <section className="report-v2-section" aria-labelledby="report-yearly-title">
      <div className="report-v2-heading">
        <div><h3 id="report-yearly-title">สรุปรายปีแยกพนักงาน</h3>
          <p>รวม {data.scheduledDays} วันทำงานจำลองต่อคน ในปี พ.ศ. {year+543}</p></div>
        <span className="report-v2-count">{visible.length} / {data.employees.length} คน</span>
      </div>
      <label className="report-v2-search">
        <YearIcon name="search"/>
        <span className="sr-only">ค้นหาพนักงาน</span>
        <input type="search" value={search} onChange={event=>setSearch(event.target.value)}
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
              <td className="report-v2-number positive">{digits(person.present)}</td>
              <td className="report-v2-number">{digits(person.absent)}</td>
              <td className="report-v2-number">{digits(person.leave)}</td>
              <td className="report-v2-number">{digits(person.late)}</td>
              <td className="report-v2-number ot">{digits(person.otHours)}</td>
              <td><button type="button" className="report-v2-open"
                aria-haspopup="dialog" onClick={()=>setSelectedCode(person.code)}>
                12 เดือน <YearIcon name="arrow" size={15}/></button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="report-v2-person-cards">
          {visible.map(person=><article className="report-v2-person-card" key={person.code}>
            <div className="report-v2-person-head">
              <div><strong>{person.name}</strong><small>{person.code} · {person.department}</small></div>
              <button type="button" onClick={()=>setSelectedCode(person.code)}
                aria-haspopup="dialog">ดูรายเดือน <YearIcon name="arrow" size={15}/></button>
            </div>
            <div className="report-v2-person-metrics">
              <span>เข้างาน <strong>{digits(person.present)}</strong></span>
              <span>ขาด <strong>{digits(person.absent)}</strong></span>
              <span>ลา <strong>{digits(person.leave)}</strong></span>
              <span>สาย <strong>{digits(person.late)}</strong></span>
              <span>OT <strong>{digits(person.otHours)} ชม.</strong></span>
            </div>
          </article>)}
        </div>
      </>}
      <p className="report-v2-footnote">กด “12 เดือน” เพื่อดูยอดของแต่ละเดือน · เข้างานรวมรายการสายแล้ว · การค้นหามีผลเฉพาะหน้าจอ ส่วน Excel ส่งออกพนักงานตัวอย่างทั้งหมด</p>
    </section>
    {selected&&<ReportDetailDialog titleId="report-yearly-detail-title" onClose={()=>setSelectedCode(null)}>
      <header className="report-v2-detail-heading report-v2-modal-header">
        <div className="report-v2-modal-person">
          <span className="report-v2-modal-avatar" aria-hidden="true">{selected.code.slice(-2)}</span>
          <div className="report-v2-modal-person-copy">
            <span className="report-v2-modal-eyebrow">รายงานการทำงาน / รายปี</span>
            <h3 id="report-yearly-detail-title">{selected.name}</h3>
            <p>{selected.code}<span className="report-v2-modal-bullet">·</span>{selected.department}</p>
            <span className="report-v2-modal-mobile-period">พ.ศ. {year+543}</span>
          </div>
        </div>
        <div className="report-v2-modal-top-actions">
          <span className="report-v2-modal-period">พ.ศ. {year+543}</span>
          <button className="report-v2-detail-close" type="button" aria-label="ปิดรายละเอียด" onClick={()=>setSelectedCode(null)}><YearIcon name="close" size={18}/></button>
        </div>
      </header>
      <div className="report-v2-modal-summary" aria-label="สรุปการทำงานรายปี">
        {[
          ["เข้างาน",selected.present,"วัน","present"],
          ["ขาด",selected.absent,"วัน","absent"],
          ["ลา",selected.leave,"วัน","leave"],
          ["สาย",selected.late,"ครั้ง","late"],
          ["OT",selected.otHours,"ชม.","ot"]
        ].map(([label,value,unit,tone])=><div className={"report-v2-modal-metric is-"+tone} key={label}>
          <span>{label}</span>
          <strong>{digits(Number(value))}<small>{unit}</small></strong>
        </div>)}
      </div>
      <div className="report-v2-modal-list-heading">
        <div><h4>ผลการทำงานแยกรายเดือน</h4><p>มกราคม – ธันวาคม · มีข้อมูล {data.includedMonths} เดือน</p></div>
        <span>{data.scheduledDays} วันทำงาน</span>
      </div>
      <div className="report-v2-detail-scroll">
        <table className="report-v2-detail-table report-v2-modal-table report-yearly-detail-table">
          <thead><tr><th scope="col">เดือน</th><th scope="col">วันทำงาน</th>
            <th scope="col">เข้างาน</th><th scope="col">ขาด</th><th scope="col">ลา</th>
            <th scope="col">สาย</th><th scope="col">OT</th></tr></thead>
          <tbody>
            {selected.months.map(entry=><tr key={entry.month} className={!entry.available?"report-yearly-future":""}>
              <td><span className="report-v2-month-label">{shortMonth(entry.month)}</span></td>
              {entry.available?<><td>{entry.scheduledDays}</td>
                <td><div className="report-v2-attendance-value"><strong>{entry.present}</strong>
                  <span className="report-v2-attendance-track" aria-hidden="true"><i style={{width:(entry.scheduledDays?Math.min(100,entry.present/entry.scheduledDays*100):0)+"%"}}/></span>
                </div></td>
                <td>{entry.absent}</td><td>{entry.leave}</td><td>{entry.late}</td>
                <td className={entry.otHours?"report-v2-modal-ot":""}>{digits(entry.otHours)}</td></>:<td colSpan={6} className="report-v2-future-label">ยังไม่มีข้อมูล</td>}
            </tr>)}
            <tr className="report-yearly-total"><td>รวมทั้งปี</td><td>{data.scheduledDays}</td>
              <td>{selected.present}</td><td>{selected.absent}</td><td>{selected.leave}</td>
              <td>{selected.late}</td><td>{digits(selected.otHours)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="report-v2-detail-footnote"><span aria-hidden="true">ⓘ</span> รายปีรวมจากข้อมูลตัวอย่าง ไม่ใช่ข้อมูลพนักงานจริง · เดือนอนาคตไม่นับเป็นขาดงาน</p>
    </ReportDetailDialog>}
  </div>;
}
