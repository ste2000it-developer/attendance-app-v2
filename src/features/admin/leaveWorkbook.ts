/**
 * Minimal standards-compliant XLSX export (Office Open XML / ZIP STORE).
 * No dependency and no network calls. All user-supplied values are written as
 * inline strings (never formulas) to avoid spreadsheet formula injection.
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

export function exportLeaveWorkbook(
  requests: AdminLeaveRequest[],
  typeLabel: (type: AdminLeaveRequest["type"]) => string,
  statusLabels: Record<Status,string>
): void {
  const headers=["เลขที่ใบลา","รหัสพนักงาน","ชื่อ–นามสกุล","แผนก","ประเภทการลา","วันเริ่มลา","วันสิ้นสุด","จำนวนวัน","วันที่ยื่น","สถานะ","วันที่พิจารณา","เหตุผลการลา","หมายเหตุการพิจารณา","เอกสารแนบ"];
  const widths=[18,18,30,24,33,17,17,14,17,18,19,47,47,28];
  const rows: (string | number)[][]=[...requests]
    .sort((a,b)=>b.submittedDate.localeCompare(a.submittedDate)||a.id.localeCompare(b.id))
    .map(item=>[
      item.id,item.employeeCode,item.employeeName,item.department,typeLabel(item.type),
      dmy(item.startDate),dmy(item.endDate),countDays(item.startDate,item.endDate),
      dmy(item.submittedDate),statusLabels[item.status],dmy(item.decisionDate),
      item.reason,item.decisionNote,item.attachment??""
    ]);
  const title='รายงานใบลาพนักงานทั้งหมด';
  const summary='รวม '+requests.length+' รายการ   |   รออนุมัติ '+requests.filter(r=>r.status==="pending").length+
    '   |   อนุมัติ '+requests.filter(r=>r.status==="approved").length+
    '   |   ไม่อนุมัติ '+requests.filter(r=>r.status==="rejected").length;
  const titleRow='<row r="1" ht="34" customHeight="1">'+cell("A",1,title,1)+'</row>';
  const noteRow='<row r="2" ht="25" customHeight="1">'+cell("A",2,"Attendance V2 · ข้อมูลตัวอย่าง ยังไม่เชื่อม Firebase",4)+'</row>';
  const sumRow='<row r="3" ht="26" customHeight="1">'+cell("A",3,summary,4)+'</row>';
  const headings='<row r="5" ht="32" customHeight="1">'+headers.map((val,i)=>cell(columnLetters(i),5,val,2)).join("")+'</row>';
  const contents=rows.map((row,index)=>'<row r="'+(index+6)+'" ht="27" customHeight="1">'+
    row.map((val,i)=>cell(columnLetters(i),index+6,val,index%2===0?0:3)).join("")+'</row>').join("");
  const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<dimension ref="A1:N'+Math.max(5,rows.length+5)+'"/>'+
    '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="22"/>'+
    '<cols>'+widths.map((width,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+width+'" customWidth="1"/>').join("")+'</cols>'+
    '<sheetData>'+titleRow+noteRow+sumRow+headings+contents+'</sheetData>'+
    '<mergeCells count="3"><mergeCell ref="A1:N1"/><mergeCell ref="A2:N2"/><mergeCell ref="A3:N3"/></mergeCells>'+
    '<autoFilter ref="A5:N'+Math.max(5,rows.length+5)+'"/>'+
    '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>'+
    '</worksheet>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="3"><font><sz val="11"/><name val="Arial"/></font>'+
    '<font><b/><sz val="16"/><color rgb="FF204B69"/><name val="Arial"/></font>'+
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts>'+
    '<fills count="4"><fill><patternFill patternType="none"/></fill>'+
    '<fill><patternFill patternType="gray125"/></fill>'+
    '<fill><patternFill patternType="solid"><fgColor rgb="FF205D81"/><bgColor indexed="64"/></patternFill></fill>'+
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F8FB"/><bgColor indexed="64"/></patternFill></fill></fills>'+
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="5">'+
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf>'+
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf>'+
    '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf>'+
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf>'+
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf></cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const files=[
    {name:"[Content_Types].xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      '</Types>'},
    {name:"_rels/.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name:"xl/workbook.xml",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
      '<sheets><sheet name="รายการใบลาทั้งหมด" sheetId="1" r:id="rId1"/></sheets></workbook>'},
    {name:"xl/_rels/workbook.xml.rels",data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'+
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {name:"xl/worksheets/sheet1.xml",data:sheet},
    {name:"xl/styles.xml",data:styles}
  ];
  const zip=xlsxZip(files);
  const blob=new Blob([zip.slice().buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="Attendance-V2-Leave-All-"+new Date().toISOString().slice(0,10)+".xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
