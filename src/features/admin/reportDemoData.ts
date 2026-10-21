/**
 * Fictional deterministic attendance records only.
 * They do not represent Firebase, actual employee schedules or payroll policy.
 */
export type ReportStatus = "present" | "late" | "leave" | "absent";
export type ReportDay = {
  date: string;
  status: ReportStatus;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  otHours: number;
};
export type ReportEmployee = {
  code: string;
  name: string;
  department: string;
  days: ReportDay[];
  present: number;
  absent: number;
  leave: number;
  late: number;
  otHours: number;
};
export type AttendanceMonth = {
  month: string;
  scheduledDates: string[];
  employees: ReportEmployee[];
  total: { present: number; absent: number; leave: number; late: number; otHours: number };
};
const staff = [
  ["DEMO-001", "พนักงานตัวอย่าง 01", "ฝ่ายปฏิบัติการ"],
  ["DEMO-002", "พนักงานตัวอย่าง 02", "ฝ่ายธุรการ"],
  ["DEMO-003", "พนักงานตัวอย่าง 03", "ฝ่ายบริการ"],
  ["DEMO-004", "พนักงานตัวอย่าง 04", "ฝ่ายบัญชี"],
  ["DEMO-005", "พนักงานตัวอย่าง 05", "ฝ่ายปฏิบัติการ"],
  ["DEMO-006", "พนักงานตัวอย่าง 06", "ฝ่ายบริการ"],
  ["DEMO-007", "พนักงานตัวอย่าง 07", "ฝ่ายธุรการ"],
  ["DEMO-008", "พนักงานตัวอย่าง 08", "ฝ่ายปฏิบัติการ"]
] as const;
const pad=(number:number)=>String(number).padStart(2,"0");
export function currentReportMonth(): string {
  const today=new Date();
  return today.getFullYear()+"-"+pad(today.getMonth()+1);
}
export function shiftReportMonth(value:string,by:number):string {
  const [year,month]=value.split("-").map(Number);
  const date=new Date(year,month-1+by,1);
  return date.getFullYear()+"-"+pad(date.getMonth()+1);
}
export function reportMonthLabel(value:string):string {
  const [year,month]=value.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH",{month:"long",year:"numeric"}).format(new Date(year,month-1,15));
}
export function reportDateLabel(iso:string):string {
  return new Intl.DateTimeFormat("th-TH",{weekday:"short",day:"numeric",month:"short",year:"numeric"})
    .format(new Date(iso+"T12:00:00"));
}
export const reportStatusLabels:Record<ReportStatus,string>={
  present:"เข้างาน",late:"มาสาย",leave:"ลา",absent:"ขาด"
};
export function createDemoAttendanceMonth(month:string):AttendanceMonth {
  const [year,m]=month.split("-").map(Number);
  const selectedIndex=year*12+m;
  const now=new Date();
  const currentIndex=now.getFullYear()*12+now.getMonth()+1;
  const lastDay=new Date(year,m,0).getDate();
  const endDay=selectedIndex===currentIndex?Math.min(lastDay,now.getDate()):lastDay;
  const scheduledDates:string[]=[];
  if(selectedIndex<=currentIndex){
    for(let day=1;day<=endDay;day++){
      const weekday=new Date(year,m-1,day).getDay();
      if(weekday!==0&&weekday!==6) scheduledDates.push(year+"-"+pad(m)+"-"+pad(day));
    }
  }
  const employees:ReportEmployee[]=staff.map(([code,name,department],index)=>{
    const days:ReportDay[]=scheduledDates.map((date,dayIndex)=>{
      const pattern=(dayIndex*3+index*7+m)%23;
      const status:ReportStatus=pattern===0?"absent":pattern===5||pattern===18?"leave":pattern===9||pattern===16?"late":"present";
      const working=status==="present"||status==="late";
      const lateMinutes=status==="late"?12+(index*5+dayIndex*7)%25:0;
      // Fictional OT hours only. Not a calculation of legal/payroll eligibility.
      const otHours=working&&(dayIndex+index*3)%5===0?2:working&&(dayIndex+index)%9===0?1.5:0;
      return {
        date,status,
        checkIn:working?(status==="late"?"08:"+pad(lateMinutes):"08:00"):null,
        checkOut:working?(otHours>0?(otHours===2?"20:00":"19:30"):"17:00"):null,
        lateMinutes,otHours
      };
    });
    return {
      code,name,department,days,
      present:days.filter(d=>d.status==="present"||d.status==="late").length,
      absent:days.filter(d=>d.status==="absent").length,
      leave:days.filter(d=>d.status==="leave").length,
      late:days.filter(d=>d.status==="late").length,
      otHours:Math.round(days.reduce((sum,d)=>sum+d.otHours,0)*10)/10
    };
  });
  return {
    month,scheduledDates,employees,
    total:employees.reduce((acc,e)=>({
      present:acc.present+e.present,
      absent:acc.absent+e.absent,
      leave:acc.leave+e.leave,
      late:acc.late+e.late,
      otHours:Math.round((acc.otHours+e.otHours)*10)/10
    }),{present:0,absent:0,leave:0,late:0,otHours:0})
  };
}
