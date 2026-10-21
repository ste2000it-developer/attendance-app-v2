import type { ReportEmployee } from "./reportDemoData";
import { reportDateLabel,reportMonthLabel,reportStatusLabels } from "./reportDemoData";
import type { AnnualEmployee,AnnualReport } from "./reportAnnualData";
import "./ReportInlineDetail.css";

const num=(value:number)=>value.toLocaleString("th-TH",{maximumFractionDigits:1});
const shortMonth=(month:string)=>new Intl.DateTimeFormat("th-TH",{month:"short"}).format(
  new Date(Number(month.slice(0,4)),Number(month.slice(5,7))-1,15)
);

function SummaryStrip({person}:{person:{
  present:number;leave:number;late:number;otHours:number;
}}){
  const measures=[
    {name:"เข้างาน",value:person.present,unit:"วัน",tone:"present"},
    {name:"ลา",value:person.leave,unit:"วัน",tone:"leave"},
    {name:"สาย",value:person.late,unit:"ครั้ง",tone:"late"},
    {name:"OT",value:person.otHours,unit:"ชม.",tone:"ot"}
  ];
  return <div className="report-inline-summary" aria-label="สรุปของพนักงาน">
    {measures.map(metric=><div className={"report-inline-stat is-"+metric.tone} key={metric.name}>
      <span>{metric.name}</span><strong>{num(metric.value)}<small>{metric.unit}</small></strong>
    </div>)}
  </div>;
}

export function MonthlyReportInline({person,month,id}:{
  person:ReportEmployee;month:string;id:string;
}){
  return <section id={id} className="report-inline" role="region" aria-label={"รายละเอียดรายวันของ "+person.name}>
    <div className="report-inline-heading">
      <div><span>รายละเอียดรายวัน · {reportMonthLabel(month)}</span><h4>{person.name}</h4></div>
      <small>{person.days.length} วันทำงานในข้อมูลตัวอย่าง</small>
    </div>
    <SummaryStrip person={person}/>
    <div className="report-inline-scroller" tabIndex={0} role="region"
      aria-label={"ตารางรายวันของ "+person.name+" เลื่อนดูรายการที่เหลือได้"}>
      <table className="report-inline-table">
        <thead><tr><th scope="col">วันที่</th><th scope="col">สถานะ</th><th scope="col">เข้า</th>
          <th scope="col">ออก</th><th scope="col">สาย</th><th scope="col">OT</th></tr></thead>
        <tbody>{person.days.length?person.days.map(day=><tr key={day.date}>
          <td className="report-inline-primary">{reportDateLabel(day.date)}</td>
          <td><span className={"report-v2-status report-v2-status-"+day.status}>{reportStatusLabels[day.status]}</span></td>
          <td>{day.checkIn??"—"}</td><td>{day.checkOut??"—"}</td>
          <td>{day.lateMinutes?day.lateMinutes+" นาที":"—"}</td>
          <td className={day.otHours?"report-inline-ot":""}>{day.otHours?num(day.otHours)+" ชม.":"—"}</td>
        </tr>):<tr><td colSpan={6} className="report-inline-empty">ยังไม่มีวันทำงานในเดือนนี้</td></tr>}</tbody>
      </table>
    </div>
    <p className="report-inline-footnote">เลื่อนในตารางเพื่อดูวันอื่น ๆ · ข้อมูลทดลอง ไม่ใช่บันทึกการลงเวลาจริง</p>
  </section>;
}

export function YearlyReportInline({person,data,id}:{
  person:AnnualEmployee;data:AnnualReport;id:string;
}){
  return <section id={id} className="report-inline" role="region" aria-label={"รายละเอียดรายเดือนของ "+person.name}>
    <div className="report-inline-heading">
      <div><span>สรุปรายเดือน · พ.ศ. {data.year+543}</span><h4>{person.name}</h4></div>
      <small>{data.includedMonths} เดือนที่มีข้อมูล</small>
    </div>
    <SummaryStrip person={person}/>
    <div className="report-inline-scroller report-inline-year-scroller" tabIndex={0} role="region"
      aria-label={"ตารางสิบสองเดือนของ "+person.name+" เลื่อนดูได้"}>
      <table className="report-inline-table report-inline-year-table">
        <thead><tr><th scope="col">เดือน</th><th scope="col">วันทำงาน</th><th scope="col">เข้างาน</th>
          <th scope="col">ลา</th><th scope="col">สาย</th>
          <th scope="col">OT (ชม.)</th></tr></thead>
        <tbody>
          {person.months.map(entry=><tr key={entry.month} className={!entry.available?"report-inline-future":""}>
            <td className="report-inline-primary">{shortMonth(entry.month)}</td>
            {entry.available?<><td>{entry.scheduledDays}</td>
              <td><div className="report-inline-attendance"><strong>{entry.present}</strong>
                <span className="report-inline-track" aria-hidden="true">
                  <i style={{width:(entry.scheduledDays?Math.min(100,entry.present/entry.scheduledDays*100):0)+"%"}}/>
                </span></div></td>
              <td>{entry.leave}</td><td>{entry.late}</td>
              <td className={entry.otHours?"report-inline-ot":""}>{num(entry.otHours)}</td>
            </>:<td colSpan={6} className="report-inline-future-text">ยังไม่ถึงเดือนนี้</td>}
          </tr>)}
          <tr className="report-inline-grand-total">
            <td>รวมทั้งปี</td><td>{data.scheduledDays}</td><td>{person.present}</td>
            <td>{person.leave}</td><td>{person.late}</td>
            <td>{num(person.otHours)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="report-inline-footnote">เข้างานนับรวมมาสายแล้ว · เดือนอนาคตยังไม่มีข้อมูล ไม่รวมเป็นวันทำงาน · เป็นข้อมูลทดลอง</p>
  </section>;
}
