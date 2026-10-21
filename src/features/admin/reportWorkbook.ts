/**
 * Professional demo-only Excel report with two worksheets:
 * Employee summary and daily detail.
 * Dependency-free Office Open XML ZIP STORE; no Firebase or API calls.
 * Text cells are ALWAYS inline strings, never evaluated as formulas.
 */
import type { AttendanceMonth, ReportStatus } from "./reportDemoData";
import type { AnnualReport } from "./reportAnnualData";
import { reportMonthLabel, reportStatusLabels } from "./reportDemoData";

type CellValue=string|number;
type ReportRow={kind:"heading"|"subheading"|"note"|"header"|"data"|"total";values:CellValue[];status?:ReportStatus};
const utf8=new TextEncoder();
const escapeXml=(value:string):string=>value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,"")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function ref(index:number):string {
  let result="";
  for(let n=index;n>=0;n=Math.floor(n/26)-1)result=String.fromCharCode(65+n%26)+result;
  return result;
}
function cell(column:number,row:number,value:CellValue,style:number):string {
  const cellRef=ref(column)+row;
  if(typeof value==="number"&&Number.isFinite(value))
    return '<c r="'+cellRef+'" s="'+style+'"><v>'+value+'</v></c>';
  return '<c r="'+cellRef+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+
    escapeXml(String(value))+'</t></is></c>';
}
const pad=(n:number)=>String(n).padStart(2,"0");
function thDate(iso:string):string {
  const [year,month,day]=iso.split("-").map(Number);
  return pad(day)+"/"+pad(month)+"/"+String(year+543);
}
function summaryRows(data:AttendanceMonth):ReportRow[] {
  const label=reportMonthLabel(data.month);
  const rows:ReportRow[]=[
    {kind:"heading",values:["รายงานสรุปการทำงานรายพนักงาน"]},
    {kind:"subheading",values:["ATTENDANCE V2  |  "+label+"  |  ข้อมูลทดลอง"]},
    {kind:"note",values:["ตัวเลขเป็นข้อมูลจำลอง ไม่มีการอ่าน Firebase หรือใช้คำนวณค่าจ้างจริง"]},
    {kind:"note",values:["เข้างานรวมมาสายแล้ว  |  วันทำงานจำลอง "+data.scheduledDates.length+" วัน  |  พนักงาน "+data.employees.length+" คน"]},
    {kind:"header",values:["รหัสพนักงาน","ชื่อพนักงาน","แผนก","เข้างาน (วัน)","ลา (วัน)","สาย (ครั้ง)","OT (ชม.)"]}
  ];
  for(const person of data.employees){
    rows.push({kind:"data",values:[
      person.code,person.name,person.department,person.present,
      person.leave,person.late,person.otHours
    ]});
  }
  rows.push({kind:"total",values:[
    "","รวมทั้งหมด","",data.total.present,data.total.leave,data.total.late,data.total.otHours
  ]});
  return rows;
}
function detailRows(data:AttendanceMonth):ReportRow[] {
  const rows:ReportRow[]=[
    {kind:"heading",values:["รายละเอียดการลงเวลารายวัน"]},
    {kind:"subheading",values:["ATTENDANCE V2  |  "+reportMonthLabel(data.month)+"  |  ข้อมูลทดลอง"]},
    {kind:"note",values:["ข้อมูลตัวอย่าง: จันทร์–ศุกร์ ไม่หักวันหยุดบริษัท OT ไม่ใช่ยอดจ่ายเงิน"]},
    {kind:"note",values:["รายการเรียงตามพนักงานและวันที่  |  เข้างานและออกงานไม่ใช่ข้อมูลสแกนจริง"]},
    {kind:"header",values:["วันที่","รหัสพนักงาน","ชื่อพนักงาน","แผนก","สถานะ","เข้างาน","ออกงาน","สาย (นาที)","OT (ชม.)"]}
  ];
  for(const person of data.employees){
    for(const day of person.days){
      rows.push({kind:"data",status:day.status,values:[
        thDate(day.date),person.code,person.name,person.department,
        reportStatusLabels[day.status],day.checkIn??"—",day.checkOut??"—",
        day.lateMinutes,day.otHours
      ]});
    }
  }
  return rows;
}
function annualSummaryRows(data:AnnualReport):ReportRow[]{
  const year=data.year+543;
  const result:ReportRow[]=[
    {kind:"heading",values:["สรุปการทำงานรายปี แยกพนักงาน"]},
    {kind:"subheading",values:["ATTENDANCE V2  |  ปี พ.ศ. "+year+"  |  ข้อมูลทดลอง"]},
    {kind:"note",values:["ข้อมูลจำลอง ไม่เชื่อม Firebase ไม่รวมวันหยุดบริษัทและไม่ใช้คำนวณค่าจ้าง"]},
    {kind:"note",values:["นับข้อมูล "+data.includedMonths+" เดือน · "+data.scheduledDays+" วันทำงานจำลอง/คน · เข้างานรวมมาสายแล้ว"]},
    {kind:"header",values:["รหัสพนักงาน","ชื่อพนักงาน","แผนก","เดือนที่นับ","วันทำงาน","เข้างาน","ลา","สาย","OT (ชม.)"]}
  ];
  for(const employee of data.employees){
    result.push({kind:"data",values:[
      employee.code,employee.name,employee.department,data.includedMonths,
      data.scheduledDays,employee.present,employee.leave,employee.late,employee.otHours
    ]});
  }
  result.push({kind:"total",values:[
    "","รวมพนักงานทั้งหมด","",data.includedMonths,
    data.scheduledDays*data.employees.length,
    data.total.present,data.total.absent,data.total.leave,data.total.late,data.total.otHours
  ]});
  return result;
}
function annualMonthlyRows(data:AnnualReport):ReportRow[]{
  const result:ReportRow[]=[
    {kind:"heading",values:["รายละเอียดรายเดือน แยกพนักงาน"]},
    {kind:"subheading",values:["ATTENDANCE V2  |  ปี พ.ศ. "+(data.year+543)+"  |  ข้อมูลทดลอง"]},
    {kind:"note",values:["เดือนอนาคตยังไม่มีข้อมูล (แสดง —) ไม่รวมเป็นวันทำงาน"]},
    {kind:"note",values:["12 เดือนต่อพนักงาน · เข้างานรวมสายแล้ว · OT เป็นชั่วโมงจำลอง"]},
    {kind:"header",values:["รหัสพนักงาน","ชื่อพนักงาน","เดือน","วันทำงาน","เข้างาน","ลา","สาย","OT (ชม.)"]}
  ];
  for(const employee of data.employees){
    for(const month of employee.months){
      result.push({kind:"data",values:[
        employee.code,employee.name,reportMonthLabel(month.month),
        month.available?month.scheduledDays:"—",
        month.available?month.present:"—",
                month.available?month.leave:"—",
        month.available?month.late:"—",
        month.available?month.otHours:"—"
      ]});
    }
    result.push({kind:"total",values:[
      employee.code,"รวม "+employee.name,"ทั้งปี",data.scheduledDays,
      employee.present,employee.absent,employee.leave,employee.late,employee.otHours
    ]});
  }
  return result;
}
function makeSheet(rows:ReportRow[],widths:number[],name:"summary"|"detail"):string {
  const finalColumn=ref(widths.length-1);
  const content=rows.map((entry,index)=>{
    const row=index+1;
    const height=entry.kind==="heading"?38:entry.kind==="subheading"?26:entry.kind==="note"?22:entry.kind==="header"?31:entry.kind==="total"?31:25;
    let xml="";
    if(entry.kind==="heading"||entry.kind==="subheading"||entry.kind==="note"){
      const style=entry.kind==="heading"?1:entry.kind==="subheading"?2:3;
      xml=cell(0,row,entry.values[0],style);
    }else{
      xml=entry.values.map((value,position)=>{
        if(entry.kind==="header")return cell(position,row,value,4);
        if(entry.kind==="total")return cell(position,row,value,9);
        if(name==="detail"&&position===4){
          const statusStyle:Record<ReportStatus,number>={present:10,late:11,leave:12};
          return cell(position,row,value,statusStyle[entry.status??"present"]);
        }
        const number=typeof value==="number";
        const striped=index%2===0;
        return cell(position,row,value,number?(striped?8:7):(striped?6:5));
      }).join("");
    }
    return '<row r="'+row+'" ht="'+height+'" customHeight="1">'+xml+'</row>';
  }).join("");
  const merges=rows.slice(0,4).map((_,i)=>'<mergeCell ref="A'+(i+1)+':'+finalColumn+(i+1)+'"/>').join("");
  const lastRow=rows.length;
  // One page wide; details may naturally use multiple A4 landscape pages vertically.
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
    '<dimension ref="A1:'+finalColumn+lastRow+'"/>'+
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="21"/>'+
    '<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>'+
    '<sheetData>'+content+'</sheetData>'+
    '<mergeCells count="4">'+merges+'</mergeCells>'+
    '<autoFilter ref="A5:'+finalColumn+lastRow+'"/>'+
    '<printOptions horizontalCentered="1"/>'+
    '<pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>'+
    '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'+
    '</worksheet>';
}
function stylesXml():string{
  const f=(body:string,size:number)=>'<font>'+body+'<sz val="'+size+'"/><name val="Tahoma"/></font>';
  const fonts=[
    f('<color rgb="FF2A4960"/>',10),                 // 0 regular
    f('<b/><color rgb="FFFFFFFF"/>',17),             // 1 title
    f('<b/><color rgb="FF2F6586"/>',11),             // 2 subtitle
    f('<color rgb="FF738A9A"/>',9.5),                // 3 note
    f('<b/><color rgb="FFFFFFFF"/>',10),             // 4 heading
    f('<b/><color rgb="FF1F516F"/>',10),             // 5 total
    f('<b/><color rgb="FF267B57"/>',10),             // 6 present
    f('<b/><color rgb="FF997330"/>',10),             // 7 late
    f('<b/><color rgb="FF626DA9"/>',10),             // 8 leave
  ];
  const fills=[
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF205D81"/><bgColor indexed="64"/></patternFill></fill>', // navy
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F2F8"/><bgColor indexed="64"/></patternFill></fill>', // blue
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF4F8FB"/><bgColor indexed="64"/></patternFill></fill>', // alternate
    '<fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF4"/><bgColor indexed="64"/></patternFill></fill>', // total
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF6EF"/><bgColor indexed="64"/></patternFill></fill>', // present
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFCF4E7"/><bgColor indexed="64"/></patternFill></fill>', // late
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF0F0FC"/><bgColor indexed="64"/></patternFill></fill>', // leave
  ];
  const borderColor='<color rgb="FFE2EAF0"/>';
  const borders=[
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left/><right/><top/><bottom style="thin">'+borderColor+'</bottom><diagonal/></border>'
  ];
  function xf(font:number,fill:number,border:number,align:string):string{
    return '<xf numFmtId="0" fontId="'+font+'" fillId="'+fill+'" borderId="'+border+
      '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment '+align+'/></xf>';
  }
  const xfs=[
    xf(0,0,0,'vertical="center"'),  // 0
    xf(1,2,0,'vertical="center" indent="1"'), // 1
    xf(2,3,0,'vertical="center" indent="1"'), // 2
    xf(3,0,0,'vertical="center" indent="1"'), // 3
    xf(4,2,0,'vertical="center" indent="1" wrapText="1"'), // 4 header
    xf(0,0,1,'vertical="center" indent="1" wrapText="1"'), // 5 data
    xf(0,4,1,'vertical="center" indent="1" wrapText="1"'), // 6 alternate
    xf(0,0,1,'horizontal="center" vertical="center"'), // 7 numeric
    xf(0,4,1,'horizontal="center" vertical="center"'), // 8 numeric alternate
    xf(5,5,1,'vertical="center" indent="1" wrapText="1"'), // 9 total
    xf(6,6,1,'vertical="center" indent="1"'), // 10 present
    xf(7,7,1,'vertical="center" indent="1"'), // 11 late
    xf(8,8,1,'vertical="center" indent="1"'), // 12 leave
  ];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="'+fonts.length+'">'+fonts.join("")+'</fonts>'+
    '<fills count="'+fills.length+'">'+fills.join("")+'</fills>'+
    '<borders count="'+borders.length+'">'+borders.join("")+'</borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="'+xfs.length+'">'+xfs.join("")+'</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}
function crc32(bytes:Uint8Array):number{
  let crc=0xFFFFFFFF;
  for(const byte of bytes){
    crc^=byte;
    for(let i=0;i<8;i++)crc=(crc&1)?((crc>>>1)^0xEDB88320):(crc>>>1);
  }
  return (crc^0xFFFFFFFF)>>>0;
}
function packZip(files:{name:string;data:string}[]):Uint8Array{
  const locals:number[]=[];
  const directory:number[]=[];
  let offset=0;
  function push16(buf:number[],n:number){buf.push(n&255,(n>>>8)&255);}
  function push32(buf:number[],n:number){push16(buf,n&0xffff);push16(buf,n>>>16);}
  for(const file of files){
    const name=utf8.encode(file.name),data=utf8.encode(file.data),crc=crc32(data);
    push32(locals,0x04034b50);push16(locals,20);push16(locals,0x0800);push16(locals,0);
    push16(locals,0);push16(locals,0);push32(locals,crc);push32(locals,data.length);
    push32(locals,data.length);push16(locals,name.length);push16(locals,0);
    for(const b of name)locals.push(b);
    for(const b of data)locals.push(b);
    push32(directory,0x02014b50);push16(directory,20);push16(directory,20);
    push16(directory,0x0800);push16(directory,0);push16(directory,0);push16(directory,0);
    push32(directory,crc);push32(directory,data.length);push32(directory,data.length);
    push16(directory,name.length);push16(directory,0);push16(directory,0);
    push16(directory,0);push16(directory,0);push32(directory,0);push32(directory,offset);
    for(const b of name)directory.push(b);
    offset+=30+name.length+data.length;
  }
  const footer:number[]=[];
  push32(footer,0x06054b50);push16(footer,0);push16(footer,0);
  push16(footer,files.length);push16(footer,files.length);
  push32(footer,directory.length);push32(footer,locals.length);push16(footer,0);
  const bytes=new Uint8Array(locals.length+directory.length+footer.length);
  bytes.set(locals,0);
  bytes.set(directory,locals.length);
  bytes.set(footer,locals.length+directory.length);
  return bytes;
}
export function exportAttendanceReportWorkbook(data:AttendanceMonth):void{
  const worksheets=[
    {name:"สรุปรายพนักงาน",path:"xl/worksheets/sheet1.xml",
      content:makeSheet(summaryRows(data),[19,30,24,18,16,17,18],"summary")},
    {name:"รายละเอียดรายวัน",path:"xl/worksheets/sheet2.xml",
      content:makeSheet(detailRows(data),[19,18,29,23,18,14,14,17,17],"detail")}
  ];
  writeReportWorkbook(worksheets,"Attendance-V2-Work-Report-"+data.month+".xlsx");
}
function writeReportWorkbook(worksheets:{name:string;path:string;content:string}[],filename:string):void{
  const files=[
    {name:"[Content_Types].xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      worksheets.map(ws=>'<Override PartName="/'+ws.path+'" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+
      '</Types>'},
    {name:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name:"xl/workbook.xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
      '<sheets>'+worksheets.map((ws,index)=>'<sheet name="'+escapeXml(ws.name)+'" sheetId="'+(index+1)+'" r:id="rId'+(index+1)+'"/>').join("")+
      '</sheets></workbook>'},
    {name:"xl/_rels/workbook.xml.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      worksheets.map((_,index)=>'<Relationship Id="rId'+(index+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(index+1)+'.xml"/>').join("")+
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
      '</Relationships>'},
    {name:"xl/styles.xml",data:stylesXml()},
    ...worksheets.map(ws=>({name:ws.path,data:ws.content}))
  ];
  const bytes=packZip(files);
  const blob=new Blob([bytes.slice().buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const uri=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=uri;
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(uri),60000);
}

export function exportAnnualReportWorkbook(data:AnnualReport):void{
  const worksheets=[
    {name:"สรุปรายปี",path:"xl/worksheets/sheet1.xml",
      content:makeSheet(annualSummaryRows(data),[19,31,25,15,17,16,15,15,18],"summary")},
    {name:"แยกรายเดือน",path:"xl/worksheets/sheet2.xml",
      content:makeSheet(annualMonthlyRows(data),[19,29,27,17,16,15,15,18],"summary")}
  ];
  writeReportWorkbook(worksheets,"Attendance-V2-Annual-Report-"+data.year+".xlsx");
}
