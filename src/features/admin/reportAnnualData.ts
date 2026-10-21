/**
 * Aggregate deterministic fictional monthly data; there are no Firebase reads.
 * Future months in the selected year have no data, not zero-attendance records.
 */
import { createDemoAttendanceMonth, currentReportMonth } from "./reportDemoData";
export type AnnualTotals = {
  present:number;leave:number;late:number;otHours:number;
};
export type AnnualMonth = AnnualTotals & {
  month:string;
  scheduledDays:number;
  available:boolean;
};
export type AnnualEmployee = AnnualTotals & {
  code:string;name:string;department:string;
  months:AnnualMonth[];
};
export type AnnualReport = {
  year:number;
  includedMonths:number;
  scheduledDays:number;
  employees:AnnualEmployee[];
  total:AnnualTotals;
};
const pad=(n:number)=>String(n).padStart(2,"0");
const empty=():AnnualTotals=>({present:0,leave:0,late:0,otHours:0});
const add=(a:AnnualTotals,b:AnnualTotals):AnnualTotals=>({
  present:a.present+b.present,
  leave:a.leave+b.leave,
  late:a.late+b.late,
  otHours:Math.round((a.otHours+b.otHours)*10)/10
});
export function currentReportYear():number {
  return Number(currentReportMonth().slice(0,4));
}
export function createDemoAttendanceYear(year:number):AnnualReport {
  const currentMonth=currentReportMonth();
  const months=Array.from({length:12},(_,i)=>{
    const month=year+"-"+pad(i+1);
    return {month,available:month<=currentMonth,data:createDemoAttendanceMonth(month)};
  });
  const employees=months[0].data.employees.map(person=>{
    const monthly:AnnualMonth[]=months.map(({month,available,data})=>{
      const row=data.employees.find(item=>item.code===person.code);
      if(!row)throw new Error("Missing demo employee for "+month);
      return {month,available,scheduledDays:data.scheduledDates.length,
        present:row.present,leave:row.leave,late:row.late,otHours:row.otHours};
    });
    return {
      code:person.code,name:person.name,department:person.department,months:monthly,
      ...monthly.reduce<AnnualTotals>((total,row)=>add(total,row),empty())
    };
  });
  return {
    year,employees,
    includedMonths:months.filter(m=>m.available).length,
    scheduledDays:months.reduce((sum,m)=>sum+m.data.scheduledDates.length,0),
    total:employees.reduce<AnnualTotals>((total,employee)=>add(total,employee),empty())
  };
}
