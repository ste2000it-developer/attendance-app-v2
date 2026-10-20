/**
 * Leave forms are exported as separate worksheets in one real XLSX file.
 * OOXML / ZIP STORE requires no external dependencies or network calls.
 * All dynamic values are inline strings, never spreadsheet formulas.
 */
import type { AdminLeaveRequest } from "./LeaveManagerPreview";

type Status = AdminLeaveRequest["status"];

const enc = new TextEncoder();
function escapeXml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function cell(column: string, row: number, value: string | number, style = 0): string {
  if (typeof value === "number" && Number.isFinite(value))
    return '<c r="' + column + row + '" s="' + style + '"><v>' + value + '</v></c>';
  return '<c r="' + column + row + '" t="inlineStr" s="' + style + '"><is><t xml:space="preserve">' +
    escapeXml(String(value ?? "")) + '</t></is></c>';
}
function columnLetters(index: number): string {
  let result = "";
  for (let n=index; n>=0; n=Math.floor(n/26)-1) result=String.fromCharCode(65+n%26)+result;
  return result;
}
function dmy(iso: string | null): string {
  if (!iso) return "";
  const [y,m,d] = iso.split("-");
  return d + "/" + m + "/" + String(Number(y)+543);
}
function countDays(start: string, end: string): number {
  const a=start.split("-").map(Number), b=end.split("-").map(Number);
  return Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000)+1;
}
function crc32(bytes: Uint8Array): number {
  let crc=0xFFFFFFFF;
  for (const b of bytes) {
    crc ^= b;
    for (let i=0;i<8;i++) crc = crc & 1 ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function xlsxZip(files: {name:string;data:string}[]): Uint8Array {
  const parts=files.map(({name,data})=>({name:enc.encode(name),data:enc.encode(data)}));
  const locals:number[]=[];
  const central:number[]=[];
  const push16=(to:number[],number:number)=>{to.push(number&255,(number>>>8)&255);};
  const push32=(to:number[],number:number)=>{push16(to,number&65535);push16(to,number>>>16);};
  let offset=0;
  for (const file of parts) {
    const crc=crc32(file.data);
    // Local header
    push32(locals,0x04034b50);push16(locals,20);push16(locals,0x0800);
    push16(locals,0);push16(locals,0);push16(locals,0);
    push32(locals,crc);push32(locals,file.data.length);push32(locals,file.data.length);
    push16(locals,file.name.length);push16(locals,0);
    locals.push(...file.name);
    const localOffset=offset;
    offset+=30+file.name.length+file.data.length;
    for (const byte of file.data) locals.push(byte);
    // Central directory
    push32(central,0x02014b50);push16(central,20);push16(central,20);
    push16(central,0x0800);push16(central,0);push16(central,0);push16(central,0);
    push32(central,crc);push32(central,file.data.length);push32(central,file.data.length);
    push16(central,file.name.length);push16(central,0);push16(central,0);
    push16(central,0);push16(central,0);push32(central,0);push32(central,localOffset);
    central.push(...file.name);
  }
  const tail:number[]=[];
  push32(tail,0x06054b50);push16(tail,0);push16(tail,0);
  push16(tail,parts.length);push16(tail,parts.length);
  push32(tail,central.length);push32(tail,locals.length);
  push16(tail,0);
  const result = new Uint8Array(locals.length + central.length + tail.length);
  result.set(locals, 0);
  result.set(central, locals.length);
  result.set(tail, locals.length + central.length);
  return result;
}


type RowData = { height: number; cells: Map<number,string> };
type FormData = { xml: string };
type SheetStyle = 0|1|2|3|4|5|6|7|8|9|10;

function leaveSheetXml(
  item: AdminLeaveRequest,
  typeLabel: (type: AdminLeaveRequest["type"]) => string,
  statusLabels: Record<Status,string>
): string {
  const rows = new Map<number, RowData>();
  const merges:string[]=[];
  const heights = new Map<number,number>([
    [1,29],[2,29],[3,24],[4,13],[5,31],[6,13],[7,30],[8,34],[9,30],
    [10,13],[11,28],[12,32],[13,33],[14,33],[15,13],[16,28],
    [17,25],[18,25],[19,25],[20,25],[21,13],[22,28],[23,26],[24,26],
    [25,13],[26,28],[27,32],[28,32],[29,30],[30,25],[31,25],[32,12],[33,27]
  ]);
  function put(row:number, col:number, text:string, style:SheetStyle) {
    let record=rows.get(row);
    if (!record) {
      record={height:heights.get(row)??22,cells:new Map<number,string>()};
      rows.set(row,record);
    }
    record.cells.set(col,cell(columnLetters(col),row,text,style));
  }
  function field(firstRow:number,firstCol:number,lastRow:number,lastCol:number,text:string,style:SheetStyle) {
    if(firstRow>lastRow||firstCol>lastCol) throw new Error("Invalid merge range");
    for(let row=firstRow;row<=lastRow;row++)
      for(let col=firstCol;col<=lastCol;col++)
        put(row,col,row===firstRow&&col===firstCol?text:"",style);
    if(firstRow!==lastRow||firstCol!==lastCol)
      merges.push('<mergeCell ref="'+columnLetters(firstCol)+firstRow+':'+columnLetters(lastCol)+lastRow+'"/>');
  }
  const statusStyle:SheetStyle = item.status==="approved"?8:item.status==="rejected"?9:7;
  const decisionText = item.status==="pending"?"รอพิจารณา":statusLabels[item.status];
  field(1,0,2,7,"ใบลาพนักงาน",1);
  field(3,0,3,7,"ATTENDANCE V2  |  แบบฟอร์มใบลา  |  ข้อมูลตัวอย่าง",2);
  field(5,0,5,1,"เลขที่ใบลา",4);
  field(5,2,5,4,item.id,5);
  field(5,5,5,5,"สถานะ",4);
  field(5,6,5,7,statusLabels[item.status],statusStyle);

  field(7,0,7,1,"รหัสพนักงาน",4);
  field(7,2,7,7,item.employeeCode,5);
  field(8,0,8,1,"ชื่อ–นามสกุล",4);
  field(8,2,8,7,item.employeeName,5);
  field(9,0,9,1,"แผนก",4);
  field(9,2,9,7,item.department,5);

  field(11,0,11,7,"รายละเอียดการลา",3);
  field(12,0,12,1,"ประเภทการลา",4);
  field(12,2,12,7,typeLabel(item.type),5);
  field(13,0,13,1,"วันเริ่มลา",4);
  field(13,2,13,3,dmy(item.startDate),5);
  field(13,4,13,5,"วันสิ้นสุด",4);
  field(13,6,13,7,dmy(item.endDate),5);
  field(14,0,14,1,"จำนวนวัน",4);
  field(14,2,14,3,String(countDays(item.startDate,item.endDate))+" วัน",5);
  field(14,4,14,5,"วันที่ยื่น",4);
  field(14,6,14,7,dmy(item.submittedDate),5);

  field(16,0,16,7,"เหตุผลการลา",3);
  field(17,0,20,7,item.reason||"ไม่ได้ระบุเหตุผล",6);

  field(22,0,22,7,"เอกสารแนบ",3);
  field(23,0,24,7,item.attachment ? "ชื่อไฟล์: "+item.attachment+" (ไฟล์ตัวอย่าง ไม่ได้แนบเอกสารจริง)" : "ไม่มีเอกสารแนบ",6);

  field(26,0,26,7,"ผลการพิจารณา",3);
  field(27,0,27,1,"ผลการอนุมัติ",4);
  field(27,2,27,7,decisionText,statusStyle);
  field(28,0,28,1,"วันที่พิจารณา",4);
  field(28,2,28,7,item.decisionDate?dmy(item.decisionDate):"ยังไม่ได้พิจารณา",5);
  field(29,0,31,1,"หมายเหตุ",4);
  field(29,2,31,7,item.decisionNote||"ไม่มีหมายเหตุ",6);

  field(33,0,33,7,"เอกสารนี้เป็นข้อมูลทดลองจาก Attendance V2 — ไม่ใช่ใบลาที่อนุมัติจริง",10);

  const sheetData = Array.from({length:33},(_,i)=>{
    const row=i+1,record=rows.get(row);
    const height=heights.get(row)??22;
    const content=record?Array.from(record.cells.entries()).sort((a,b)=>a[0]-b[0]).map(pair=>pair[1]).join(""):"";
    return '<row r="'+row+'" ht="'+height+'" customHeight="1">'+content+'</row>';
  }).join("");
  const widths=[12,14,17,14,12,14,17,19];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
    '<dimension ref="A1:H33"/>'+
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="22"/>'+
    '<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>'+
    '<sheetData>'+sheetData+'</sheetData>'+
    '<mergeCells count="'+merges.length+'">'+merges.join("")+'</mergeCells>'+
    '<printOptions horizontalCentered="1"/>'+
    '<pageMargins left="0.3" right="0.3" top="0.35" bottom="0.35" header="0.15" footer="0.15"/>'+
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/>'+
    '</worksheet>';
}
function makeStyles():string {
  const font=(body:string,size:number)=>'<font>'+body+'<sz val="'+size+'"/><name val="Tahoma"/></font>';
  const white='<color rgb="FFFFFFFF"/>';
  const title='<color rgb="FF204B69"/>';
  const muted='<color rgb="FF627D91"/>';
  const standard='<color rgb="FF234761"/>';
  const fills=[
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF205D81"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF3F8"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF5F8FA"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFBF1DC"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F5EC"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFAEBEA"/><bgColor indexed="64"/></patternFill></fill>'
  ];
  const fonts=[
    font(standard,11),font('<b/>'+white,19),font(muted,10),
    font('<b/>'+title,11),font('<b/>'+muted,10),
    font('<b/><color rgb="FF94651C"/>',11),
    font('<b/><color rgb="FF24734D"/>',11),
    font('<b/><color rgb="FFA9544B"/>',11),
    font(muted,9)
  ];
  const edge='<border><left/><right/><top/><bottom style="hair"><color rgb="FFE2EAF0"/></bottom><diagonal/></border>';
  function xf(fontId:number,fillId:number,borderId:number,alignment:string) {
    return '<xf numFmtId="0" fontId="'+fontId+'" fillId="'+fillId+'" borderId="'+borderId+
      '" xfId="0" applyAlignment="1"><alignment '+alignment+'/></xf>';
  }
  const styles=[
    xf(0,0,0,'vertical="center"'),
    xf(1,2,0,'horizontal="center" vertical="center"'),
    xf(2,3,0,'horizontal="center" vertical="center"'),
    xf(3,3,0,'vertical="center" indent="1"'),
    xf(4,4,1,'vertical="center" indent="1" wrapText="1"'),
    xf(0,0,1,'vertical="center" indent="1" wrapText="1"'),
    xf(0,0,1,'vertical="top" indent="1" wrapText="1"'),
    xf(5,5,1,'horizontal="center" vertical="center"'),
    xf(6,6,1,'horizontal="center" vertical="center"'),
    xf(7,7,1,'horizontal="center" vertical="center"'),
    xf(8,3,0,'horizontal="center" vertical="center"')
  ];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="'+fonts.length+'">'+fonts.join("")+'</fonts>'+
    '<fills count="'+fills.length+'">'+fills.join("")+'</fills>'+
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+edge+'</borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="'+styles.length+'">'+styles.join("")+'</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'+
    '</styleSheet>';
}

export function exportLeaveWorkbook(
  requests: AdminLeaveRequest[],
  typeLabel: (type: AdminLeaveRequest["type"]) => string,
  statusLabels: Record<Status,string>
): void {
  // One leave form per worksheet, all forms in a single workbook.
  const items=[...requests].sort((a,b)=>b.submittedDate.localeCompare(a.submittedDate)||a.id.localeCompare(b.id));
  if(items.length===0) throw new Error("No leave requests to export");
  const sheetList=items.map((item,index)=>({
    title:"ใบลา "+String(index+1).padStart(3,"0"),
    id:index+1,
    xml:leaveSheetXml(item,typeLabel,statusLabels)
  }));
  const worksheetFiles=sheetList.map(sheet=>({name:"xl/worksheets/sheet"+sheet.id+".xml",data:sheet.xml}));
  const workbookSheets=sheetList.map(sheet=>
    '<sheet name="'+escapeXml(sheet.title)+'" sheetId="'+sheet.id+'" r:id="rId'+sheet.id+'"/>'
  ).join("");
  const overrides=sheetList.map(sheet=>
    '<Override PartName="/xl/worksheets/sheet'+sheet.id+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
  ).join("");
  const relationships=sheetList.map(sheet=>
    '<Relationship Id="rId'+sheet.id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+sheet.id+'.xml"/>'
  ).join("");
  const files=[
    {name:"[Content_Types].xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      overrides+'</Types>'},
    {name:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name:"xl/workbook.xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
      '<bookViews><workbookView activeTab="0"/></bookViews><sheets>'+workbookSheets+'</sheets></workbook>'},
    {name:"xl/_rels/workbook.xml.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+relationships+
      '<Relationship Id="rId'+(items.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
      '</Relationships>'},
    {name:"xl/styles.xml",data:makeStyles()},
    ...worksheetFiles
  ];
  const zip=xlsxZip(files);
  const blob=new Blob([zip.slice().buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="Attendance-V2-Leave-Forms-"+new Date().toISOString().slice(0,10)+".xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
