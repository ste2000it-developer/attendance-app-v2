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
function leaveSheetXml(
  item: AdminLeaveRequest,
  typeLabel: (type: AdminLeaveRequest["type"]) => string,
  statusLabels: Record<Status,string>
): string {
  const rows = new Map<number, Map<number,string>>();
  const merges: string[] = [];

  // Standard row heights are deliberately small; free text grows only when needed.
  // Count line breaks as well as length so longer real-world notes remain legible.
  function freeTextHeight(value: string, approxCharsPerLine: number, minimum: number) {
    const lineCount = (value || "—").split("\n")
      .reduce((total,line) => total + Math.max(1,Math.ceil(line.length/approxCharsPerLine)),0);
    return Math.min(190, Math.max(minimum,lineCount*16+8));
  }
  const heights = [
    4,29,17,7,27,27,7,22,28,28,28,
    freeTextHeight(item.reason,77,29),
    7,22,28,freeTextHeight(item.decisionNote,75,28),7,19
  ];
  function put(row: number, column: number, value: string, style: number) {
    let cells = rows.get(row);
    if (!cells) { cells = new Map(); rows.set(row,cells); }
    cells.set(column,cell(columnLetters(column),row,value,style));
  }
  function region(row: number, colStart: number, colEnd: number, value: string, style: number) {
    for (let col=colStart;col<=colEnd;col++) put(row,col,col===colStart?value:"",style);
    if (colEnd>colStart)
      merges.push('<mergeCell ref="'+columnLetters(colStart)+row+':'+columnLetters(colEnd)+row+'"/>');
  }
  const decisionText=item.status==="pending"?"รอพิจารณา":statusLabels[item.status];
  const decisionStyle=item.status==="approved"?8:item.status==="rejected"?9:7;
  const attachment=item.attachment ? item.attachment + " (ชื่อไฟล์ตัวอย่าง)" : "—";
  // A:F with two aligned label/value pairs where appropriate.
  region(1,0,5,"",12);
  region(2,0,2,"ใบลาพนักงาน",1);
  region(2,3,5,"เลขที่  "+item.id,11);
  region(3,0,5,"ATTENDANCE V2  /  LEAVE REQUEST",2);

  region(5,0,0,"ชื่อพนักงาน",4);
  region(5,1,2,item.employeeName,5);
  region(5,3,3,"รหัสพนักงาน",4);
  region(5,4,5,item.employeeCode,5);
  region(6,0,0,"แผนก",4);
  region(6,1,2,item.department,5);
  region(6,3,3,"วันที่ยื่น",4);
  region(6,4,5,dmy(item.submittedDate),5);

  region(8,0,5,"รายละเอียดการลา",3);
  region(9,0,0,"ประเภทการลา",4);
  region(9,1,5,typeLabel(item.type),5);
  region(10,0,0,"เริ่มวันที่",4);
  region(10,1,2,dmy(item.startDate),5);
  region(10,3,3,"สิ้นสุดวันที่",4);
  region(10,4,5,dmy(item.endDate),5);
  region(11,0,0,"จำนวนวัน",4);
  region(11,1,2,String(countDays(item.startDate,item.endDate))+" วัน",5);
  region(11,3,3,"เอกสารแนบ",4);
  region(11,4,5,attachment,6);
  region(12,0,0,"เหตุผลการลา",4);
  region(12,1,5,item.reason||"—",6);

  region(14,0,5,"ผลการพิจารณา",3);
  region(15,0,0,"ผลอนุมัติ",4);
  region(15,1,2,decisionText,decisionStyle);
  region(15,3,3,"วันที่พิจารณา",4);
  region(15,4,5,item.decisionDate?dmy(item.decisionDate):"—",5);
  region(16,0,0,"หมายเหตุ",4);
  region(16,1,5,item.decisionNote||"—",6);

  region(18,0,5,"เอกสารตัวอย่างจาก Attendance V2  •  ไม่ใช่เอกสารอนุมัติจริง",10);

  const sheetRows=heights.map((height,index)=>{
    const row=index+1;
    const content=Array.from(rows.get(row)?.entries()??[])
      .sort((a,b)=>a[0]-b[0]).map(entry=>entry[1]).join("");
    return '<row r="'+row+'" ht="'+height+'" customHeight="1">'+content+'</row>';
  }).join("");
  const widths=[16,19,17,18,18,20];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
    '<dimension ref="A1:F18"/>'+
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="19"/>'+
    '<cols>'+widths.map((width,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+width+'" customWidth="1"/>').join("")+'</cols>'+
    '<sheetData>'+sheetRows+'</sheetData>'+
    '<mergeCells count="'+merges.length+'">'+merges.join("")+'</mergeCells>'+
    '<printOptions horizontalCentered="1"/>'+
    '<pageMargins left="0.42" right="0.42" top="0.48" bottom="0.48" header="0.16" footer="0.16"/>'+
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/>'+
    '</worksheet>';
}
function makeStyles(): string {
  const font=(body:string,size:number)=>'<font>'+body+'<sz val="'+size+'"/><name val="Tahoma"/></font>';
  const navy='<color rgb="FF1E4963"/>';
  const slate='<color rgb="FF637E90"/>';
  const charcoal='<color rgb="FF31485A"/>';
  const fonts=[
    font(charcoal,10),                              // body
    font('<b/>'+navy,15),                           // heading
    font(slate,8.5),                               // small subtitle
    font('<b/>'+navy,10),                           // section
    font(slate,9),                                 // labels
    font('<b/>'+navy,9.3),                          // document number
    font('<b/><color rgb="FF936920"/>',9.5),       // pending
    font('<b/><color rgb="FF247A54"/>',9.5),       // approved
    font('<b/><color rgb="FFA1544B"/>',9.5),       // rejected
    font(slate,8)                                  // footer
  ];
  const fills=[
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF205D81"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF0F5F8"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF7E8"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF8F3"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFBF0EF"/><bgColor indexed="64"/></patternFill></fill>'
  ];
  const hairline='<border><left/><right/><top/><bottom style="hair"><color rgb="FFDFE8EE"/></bottom><diagonal/></border>';
  const borders='<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+hairline+'</borders>';
  function xf(fontId:number,fillId:number,borderId:number,alignment:string) {
    return '<xf numFmtId="0" fontId="'+fontId+'" fillId="'+fillId+'" borderId="'+borderId+
      '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment '+alignment+'/></xf>';
  }
  const styles=[
    xf(0,0,0,'vertical="center"'),                                      // 0
    xf(1,0,0,'vertical="center"'),                                      // 1 title
    xf(2,0,0,'vertical="center"'),                                      // 2 caption
    xf(3,3,0,'vertical="center" indent="1"'),                           // 3 section
    xf(4,0,1,'vertical="center"'),                                      // 4 label
    xf(0,0,1,'vertical="center" indent="1" wrapText="1"'),              // 5 value
    xf(0,0,1,'vertical="center" indent="1" wrapText="1"'),              // 6 long content
    xf(6,4,1,'vertical="center" indent="1"'),                           // 7 pending
    xf(7,5,1,'vertical="center" indent="1"'),                           // 8 approved
    xf(8,6,1,'vertical="center" indent="1"'),                           // 9 rejected
    xf(9,0,0,'vertical="center"'),                                      // 10 footnote
    xf(5,0,0,'vertical="center" horizontal="right"'),                  // 11 doc number
    xf(0,2,0,'vertical="center"')                                       // 12 top bar
  ];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="'+fonts.length+'">'+fonts.join("")+'</fonts>'+
    '<fills count="'+fills.length+'">'+fills.join("")+'</fills>'+
    borders+
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
