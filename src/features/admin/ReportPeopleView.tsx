import {useEffect,useRef,useState} from "react";
import type {ReportEmployee} from "./reportDemoData";
import type {AnnualEmployee} from "./reportAnnualData";
import {reportDateLabel,reportStatusLabels} from "./reportDemoData";
import "./ReportPeopleView.css";

/**
 * Master/detail report layout based on a compact attendance table (left)
 * and selected employee's live-updating profile (right).
 * All data is fictional preview data; no accounts or images are fetched.
 */
type Person=ReportEmployee|AnnualEmployee;
type Props={
  mode:"month"|"year";
  employees:Person[];
  periodLabel:string;
  scheduledDays:number;
  availableMonths?:number;
};
const readable=(number:number)=>number.toLocaleString("th-TH",{maximumFractionDigits:1});
const rate=(count:number,total:number)=>total>0?Math.round(count*100/total):0;
const fmtShortDate=(iso:string)=>new Intl.DateTimeFormat("th-TH",{day:"numeric",month:"short"}).format(new Date(iso+"T12:00:00"));
const fmtShortMonth=(iso:string)=>new Intl.DateTimeFormat("th-TH",{month:"short"}).format(
  new Date(Number(iso.slice(0,4)),Number(iso.slice(5,7))-1,15)
);
const colorStyle=(code:string)=>"report-split-color-"+(Number(code.slice(-2))%8||8);

function EmployeeProfile({person,periodLabel,scheduledDays,mode,availableMonths,onClose}:{
  person:Person;periodLabel:string;scheduledDays:number;mode:"month"|"year";availableMonths?:number;
  onClose:()=>void;
}){
  const [allHistory,setAllHistory]=useState(false);
  const presence=rate(person.present,scheduledDays);
  const leaveRate=rate(person.leave,scheduledDays);
  const hasDailyHistory="days" in person;
  const totalRows=hasDailyHistory?person.days.length:person.months.length;
  const historyToShow=allHistory?totalRows:5;

  return <aside className={"report-split-profile "+colorStyle(person.code)} aria-label={"รายละเอียดการทำงานของ "+person.name}>
    <div className="report-split-cover"><button type="button" className="report-split-close" onClick={onClose} aria-label="ซ่อนรายละเอียดพนักงาน">×</button></div>
    <div className="report-split-identity">
      <div className={"report-split-avatar report-split-profile-avatar "+colorStyle(person.code)}
        aria-hidden="true">{person.code.slice(-2)}</div>
      <h3>{person.name}</h3>
      <span className="report-split-identity-sub">{person.department}</span>
    </div>

    <dl className="report-split-meta">
      <div><dt>รหัสพนักงาน</dt><dd>{person.code}</dd></div>
      <div><dt>แผนก</dt><dd>{person.department}</dd></div>
      <div><dt>ช่วงรายงาน</dt><dd>{periodLabel}</dd></div>
      <div><dt>ข้อมูล</dt><dd><span className="report-split-demo-label">ตัวอย่าง</span></dd></div>
    </dl>

    <div className="report-split-insights">
      <div className="report-split-insight is-presence">
        <span>อัตราการเข้างาน</span>
        <strong>{presence}%</strong>
        <span className="report-split-progress" aria-hidden="true"><i style={{width:presence+"%"}}/></span>
        <small>{person.present} จาก {scheduledDays} วันทำงาน</small>
      </div>
      <div className="report-split-insight is-leave">
        <span>สัดส่วนวันลา</span>
        <strong>{leaveRate}%</strong>
        <span className="report-split-progress" aria-hidden="true"><i style={{width:leaveRate+"%"}}/></span>
        <small>{person.leave} จาก {scheduledDays} วันทำงาน</small>
      </div>
    </div>

    <div className="report-split-tiny-stats" aria-label="ยอดสรุปพนักงาน">
      <div><span>สาย</span><strong>{person.late} <small>ครั้ง</small></strong></div>
      <div><span>OT</span><strong>{readable(person.otHours)} <small>ชม.</small></strong></div>
    </div>

    <section className="report-split-history" aria-labelledby="report-split-history-title">
      <div className="report-split-history-head">
        <div><h4 id="report-split-history-title">{mode==="month"?"ประวัติรายวัน":"สรุปรายเดือน"}</h4>
          <p>{mode==="month"?"เข้า–ออกงาน และสถานะ":(availableMonths??0)+" เดือนที่มีข้อมูล"}</p></div>
        <span className="report-split-history-total">{totalRows} รายการ</span>
      </div>
      <div className={"report-split-history-rows"+(allHistory?" is-all":"")}>
        {hasDailyHistory ? (
          person.days.length ? [...person.days].reverse().slice(0,historyToShow).map(day=>(
            <div className="report-split-history-entry" key={day.date} title={reportDateLabel(day.date)}>
              <div className="report-split-entry-date">{fmtShortDate(day.date)}</div>
              <div className="report-split-entry-content">
                <span className={"report-split-entry-status is-"+day.status}>{reportStatusLabels[day.status]}</span>
                <small>{day.checkIn&&day.checkOut?day.checkIn+" – "+day.checkOut:"ไม่มีเวลาลงงาน"}</small>
              </div>
              <div className="report-split-entry-right">{day.otHours?readable(day.otHours)+" ชม. OT":""}</div>
            </div>
          )):<div className="report-split-no-history">ยังไม่มีรายการของเดือนนี้</div>
        ) : (
          person.months.slice(0,historyToShow).map(entry=>(
            <div className={"report-split-history-entry"+(!entry.available?" is-future":"")} key={entry.month}>
              <div className="report-split-entry-date">{fmtShortMonth(entry.month)}</div>
              <div className="report-split-entry-content">
                <span className="report-split-month-count">{entry.available?"เข้างาน "+entry.present+" วัน":"ยังไม่มีข้อมูล"}</span>
                <small>{entry.available?"ลา "+entry.leave+" · สาย "+entry.late:"ยังไม่ถึงเดือนนี้"}</small>
              </div>
              <div className="report-split-entry-right">{entry.available&&entry.otHours?readable(entry.otHours)+" ชม. OT":""}</div>
            </div>
          ))
        )}
      </div>
      {totalRows>5&&<button className="report-split-history-toggle" type="button"
        aria-expanded={allHistory} onClick={()=>setAllHistory(value=>!value)}>
        {allHistory?"แสดงน้อยลง":"ดูประวัติทั้งหมด"}
        <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={allHistory?"m6 15 6-6 6 6":"m6 9 6 6 6-6"}/>
        </svg>
      </button>}
    </section>
    <p className="report-split-profile-footnote">ข้อมูลทดลอง ไม่ใช่ข้อมูลลงเวลาหรือผลคำนวณค่าจ้างจริง</p>
  </aside>;
}

export default function ReportPeopleView({mode,employees,periodLabel,scheduledDays,availableMonths}:Props){
  const [query,setQuery]=useState("");
  const [selectedCode,setSelectedCode]=useState<string|null>(null);
  const profileRef=useRef<HTMLDivElement|null>(null);
  // On phones a selected profile appears above the cards, and becomes visible immediately.
  useEffect(()=>{
    if(!selectedCode || !window.matchMedia("(max-width:700px)").matches)return;
    const frame=window.requestAnimationFrame(()=>profileRef.current?.scrollIntoView({
      behavior:"smooth",block:"start"
    }));
    return ()=>window.cancelAnimationFrame(frame);
  },[selectedCode]);
  const search=query.trim().toLocaleLowerCase("th-TH");
  const visible=employees.filter(person=>[person.name,person.code,person.department].some(
    value=>value.toLocaleLowerCase("th-TH").includes(search)
  ));
  const selected=visible.find(person=>person.code===selectedCode)??null;
  const togglePerson=(code:string)=>setSelectedCode(current=>current===code?null:code);
  return <div className={"report-split-grid"+(selected?" has-selection":"")}>
    <section className="report-split-list" aria-label="รายชื่อพนักงานและยอดรายงาน">
      <div className="report-split-list-heading">
        <div>
          <span className="report-split-kicker">ATTENDANCE / {mode==="month"?"MONTHLY":"YEARLY"}</span>
          <h3>รายงานพนักงาน</h3>
          <p>กดชื่อพนักงานเพื่อแสดงรายละเอียด กดซ้ำเพื่อซ่อน</p>
        </div>
        <span className="report-split-counter">{visible.length} คน</span>
      </div>
      <label className="report-split-search">
        <svg width="17" height="17" viewBox="0 0 24 24" stroke="currentColor" fill="none"
          strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>
        </svg>
        <span className="sr-only">ค้นหาชื่อ รหัส หรือแผนก</span>
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="ค้นหาพนักงาน ชื่อ รหัส หรือแผนก" />
      </label>
      <div className="report-split-table-scroll">
        <table className="report-split-table">
          <thead><tr>
            <th scope="col">พนักงาน</th><th scope="col">เข้างาน</th><th scope="col">ลา</th><th scope="col">สาย</th><th scope="col">OT</th><th scope="col">{mode==="month"?"ดูรายวัน":"ดูรายเดือน"}</th>
          </tr></thead>
          <tbody>{visible.map(person=><tr key={person.code}
            className={colorStyle(person.code)+(selected?.code===person.code?" is-selected":"")}
            onClick={()=>togglePerson(person.code)}>
            <td><button type="button" className="report-split-person-button"
              aria-pressed={selected?.code===person.code}
              aria-label={"ดูรายงานของ "+person.name}
              onClick={event=>{event.stopPropagation();togglePerson(person.code);}}>
              <span className={"report-split-avatar report-split-row-avatar "+colorStyle(person.code)}
                aria-hidden="true">{person.code.slice(-2)}</span>
              <span className="report-split-person-text"><strong>{person.name}</strong>
                <small>{person.department}</small></span>
            </button></td>
            <td className="report-split-number is-present" data-label="เข้างาน">{person.present}</td>
            <td className="report-split-number" data-label="ลา">{person.leave}</td>
            <td className="report-split-number" data-label="สาย">{person.late}</td>
            <td className="report-split-number is-ot" data-label="OT (ชม.)">{readable(person.otHours)}</td>
            <td className="report-split-action-cell">
              <div className="report-split-actions">
                <button type="button"
                  className={"report-split-action"+(selected?.code===person.code?" is-active":"")}
                  aria-expanded={selected?.code===person.code}
                  aria-label={(mode==="month"?"ดูรายวันของ ":"ดูรายเดือนของ ")+person.name}
                  onClick={event=>{event.stopPropagation();togglePerson(person.code);}}>
                  {mode==="month"?"รายวัน":"รายเดือน"}
                </button>
              </div>
            </td>
          </tr>)}</tbody>
        </table>
        {!visible.length&&<div className="report-split-empty">ไม่พบพนักงานที่ตรงกับคำค้นหา</div>}
      </div>
      <div className="report-split-list-footer">
        <span>กด{mode==="month"?"รายวัน":"รายเดือน"}เพื่อดูรายละเอียด หรือกดซ้ำเพื่อซ่อน</span>
        <span>{mode==="month"?"สรุปรายเดือน":"สรุปรายปี"} · ข้อมูลทดลอง</span>
      </div>
    </section>
    {selected?<div ref={profileRef} className="report-split-profile-shell">
      <EmployeeProfile key={mode+"-"+periodLabel+"-"+selected.code}
        person={selected} periodLabel={periodLabel} mode={mode}
        scheduledDays={scheduledDays} availableMonths={availableMonths} onClose={()=>setSelectedCode(null)}/>
      </div>:null}
  </div>;
}
