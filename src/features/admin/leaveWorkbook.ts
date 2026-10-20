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



/**
 * Compact printable leave form: 1 sheet = 1 leave request.
 * White space replaces heavy grid borders; section bars and status carry hierarchy.
 */
/**
 * One concise leave form per sheet: no large blue banner, no oversized blocks.
 * A4 portrait, with adaptive heights only for lengthy free-text fields.
 */
/**
 * Readable compact A4 leave form: clear label/value hierarchy, not a dense table.
 * Every request remains a separate worksheet in one XLSX workbook.
 */
function leaveSheetXml(
  item: AdminLeaveRequest,
  typeLabel: (type: AdminLeaveRequest["type"]) => string,
  statusLabels: Record<Status,string>
): string {
  const cells=new Map<number, Map<number,string>>();
  const merges:string[]=[];
  function write(row:number,col:number,value:string,style:number) {
    const values=cells.get(row)??new Map<number,string>();
    values.set(col,cell(columnLetters(col),row,value,style));
    cells.set(row,values);
  }
  function block(row:number,start:number,end:number,value:string,style:number) {
    for(let i=start;i<=end;i++)write(row,i,i===start?value:"",style);
    if(start<end)merges.push('<mergeCell ref="'+columnLetters(start)+row+':'+columnLetters(end)+row+'"/>');
  }
  // Free text grows for longer notes; ordinary rows never become unnecessarily tall.
  function textHeight(value:string,charsPerLine:number,min:number):number {
    const lines=(value||"—").split("\n").reduce(
      (n,line)=>n+Math.max(1,Math.ceil(line.length/charsPerLine)),0
    );
    return Math.min(170,Math.max(min,16*lines+11));
  }
  const status=item.status==="pending"?"รอพิจารณา":statusLabels[item.status];
  const statusStyle=item.status==="approved"?10:item.status==="rejected"?11:9;
  const attachment=item.attachment?item.attachment+" (ชื่อไฟล์ตัวอย่าง)":"ไม่มีเอกสารแนบ";
  const heights=[
    7,36,18,10,25,16,26,16,26,10,25,16,28,16,28,
    17,textHeight(item.reason,75,34),17,textHeight(attachment,74,27),10,
    25,16,27,17,textHeight(item.decisionNote,77,29),10,18
  ];

  block(2,1,4,"ใบลาพนักงาน",1);
  block(2,5,6,"เลขที่ "+item.id,2);
  block(3,1,6,"ATTENDANCE V2  /  LEAVE REQUEST",3);

  block(5,1,6,"ข้อมูลพนักงาน",4);
  block(6,1,3,"ชื่อ–นามสกุล",5);
  block(6,4,6,"รหัสพนักงาน",5);
  block(7,1,3,item.employeeName,6);
  block(7,4,6,item.employeeCode,7);
  block(8,1,3,"แผนก",5);
  block(8,4,6,"วันที่ยื่นคำขอ",5);
  block(9,1,3,item.department,7);
  block(9,4,6,dmy(item.submittedDate),7);

  block(11,1,6,"รายละเอียดการลา",4);
  block(12,1,6,"ประเภทการลา",5);
  block(13,1,6,typeLabel(item.type),6);
  block(14,1,2,"วันเริ่มลา",5);
  block(14,3,4,"วันสิ้นสุด",5);
  block(14,5,6,"จำนวนวัน",5);
  block(15,1,2,dmy(item.startDate),7);
  block(15,3,4,dmy(item.endDate),7);
  block(15,5,6,String(countDays(item.startDate,item.endDate))+" วัน",6);
  block(16,1,6,"เหตุผลการลา",5);
  block(17,1,6,item.reason||"—",8);
  block(18,1,6,"เอกสารแนบ",5);
  block(19,1,6,attachment,8);

  block(21,1,6,"ผลการพิจารณา",4);
  block(22,1,3,"สถานะ",5);
  block(22,4,6,"วันที่พิจารณา",5);
  block(23,1,3,status,statusStyle);
  block(23,4,6,item.decisionDate?dmy(item.decisionDate):"ยังไม่พิจารณา",7);
  block(24,1,6,"หมายเหตุการพิจารณา",5);
  block(25,1,6,item.decisionNote||"ไม่มีหมายเหตุ",8);
  block(27,1,6,"เอกสารตัวอย่างจาก Attendance V2 · ยังไม่ใช่ใบลาอนุมัติจริง",12);

  const xmlRows=heights.map((height,i)=>{
    const row=i+1;
    const entries=[...(cells.get(row)?.entries()??[])].sort((a,b)=>a[0]-b[0]);
    return '<row r="'+row+'" ht="'+height+'" customHeight="1">'+entries.map(e=>e[1]).join("")+'</row>';
  }).join("");
  // A and H provide natural left/right gutters in Excel view.
  const widths=[3.6,19,17,17,17,17,21,3.6];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
    '<dimension ref="A1:H27"/>'+
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="20"/>'+
    '<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>'+
    '<sheetData>'+xmlRows+'</sheetData>'+
    '<mergeCells count="'+merges.length+'">'+merges.join("")+'</mergeCells>'+
    '<printOptions horizontalCentered="1"/>'+
    '<pageMargins left="0.42" right="0.42" top="0.42" bottom="0.42" header="0.16" footer="0.16"/>'+
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/>'+
    '</worksheet>';
}
function makeStyles():string {
  const navy='<color rgb="FF204B68"/>';
  const ink='<color rgb="FF263F52"/>';
  const muted='<color rgb="FF677F90"/>';
  const font=(features:string,size:number)=>
    '<font>'+features+'<sz val="'+size+'"/><name val="Tahoma"/></font>';
  const fonts=[
    font(ink,11),                                   // body value
    font('<b/>'+navy,17),                           // title
    font('<b/>'+navy,10.5),                         // reference
    font(muted,9),                                 // subtitle
    font('<b/>'+navy,11),                           // section
    font(muted,10),                                // label
    font('<b/>'+ink,11.5),                          // important value
    font(ink,11),                                  // standard value
    font('<color rgb="FF39576B"/>',11),             // multiline
    font('<b/><color rgb="FF956B2D"/>',11),         // pending
    font('<b/><color rgb="FF2A7756"/>',11),         // approved
    font('<b/><color rgb="FFA35E56"/>',11),         // rejected
    font(muted,8.5)                                // footnote
  ];
  const fills=[
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEDF4F8"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFCF3E4"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE9F6EF"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFAEBE9"/><bgColor indexed="64"/></patternFill></fill>'
  ];
  const soft='<border><left/><right/><top/><bottom style="hair"><color rgb="FFD8E4EB"/></bottom><diagonal/></border>';
  const borders='<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+soft+'</borders>';
  function style(fontId:number,fillId:number,borderId:number,align:string){
    return '<xf numFmtId="0" fontId="'+fontId+'" fillId="'+fillId+'" borderId="'+borderId+
      '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment '+align+'/></xf>';
  }
  const xfs=[
    style(0,0,0,'vertical="center"'),                                       // 0 normal
    style(1,0,0,'vertical="center"'),                                       // 1 title
    style(2,0,0,'vertical="center" horizontal="right"'),                   // 2 document number
    style(3,0,0,'vertical="center"'),                                       // 3 subtitle
    style(4,2,0,'vertical="center" indent="1"'),                            // 4 section
    style(5,0,0,'vertical="bottom"'),                                       // 5 label
    style(6,0,1,'vertical="center" wrapText="1"'),                          // 6 primary value
    style(7,0,1,'vertical="center" wrapText="1"'),                          // 7 value
    style(8,0,1,'vertical="center" wrapText="1"'),                          // 8 long text
    style(9,3,0,'vertical="center" indent="1"'),                            // 9 pending status
    style(10,4,0,'vertical="center" indent="1"'),                           // 10 approved
    style(11,5,0,'vertical="center" indent="1"'),                           // 11 rejected
    style(12,0,0,'vertical="center"')                                       // 12 footer
  ];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="'+fonts.length+'">'+fonts.join("")+'</fonts>'+
    '<fills count="'+fills.length+'">'+fills.join("")+'</fills>'+
    borders+'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="'+xfs.length+'">'+xfs.join("")+'</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
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
