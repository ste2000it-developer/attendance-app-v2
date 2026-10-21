import {useMemo,useState} from "react";
import {createDemoAttendanceYear,currentReportYear} from "./reportAnnualData";
import {exportAnnualReportWorkbook} from "./reportWorkbook";
import ReportPeopleView from "./ReportPeopleView";
import "./ReportYearlyPreview.css";

function YearIcon({name,size=17}:{name:"left"|"right"|"download"|"search";size?:number}) {
  const paths={
    left:<path d="m15 5-7 7 7 7"/>,
    right:<path d="m9 5 7 7-7 7"/>,
    download:<><path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/></>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const totals=[
  {key:"present",label:"เข้างาน",suffix:"วัน-คน",hint:"รวมวันที่มาสายแล้ว"},
  {key:"leave",label:"ลางาน",suffix:"วัน-คน",hint:"ไม่เชื่อมใบลาจริง"},
  {key:"late",label:"มาสาย",suffix:"ครั้ง",hint:"นับอยู่ในวันเข้างาน"},
  {key:"otHours",label:"OT รวม",suffix:"ชม.",hint:"ชั่วโมงสมมติ"}
] as const;
const digits=(number:number)=>number.toLocaleString("th-TH",{maximumFractionDigits:1});

export default function ReportYearlyPreview(){
  const [year,setYear]=useState(currentReportYear);
  const [error,setError]=useState("");
  const data=useMemo(()=>createDemoAttendanceYear(year),[year]);
  const earliest=currentReportYear()-4;
  const latest=currentReportYear();
  function moveYear(change:number){
    const target=year+change;
    if(target<earliest||target>latest)return;
    setYear(target);
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
    <ReportPeopleView key={year} mode="year" employees={data.employees}
      periodLabel={"พ.ศ. "+(year+543)} scheduledDays={data.scheduledDays}
      availableMonths={data.includedMonths}
      />

  </div>;
}
