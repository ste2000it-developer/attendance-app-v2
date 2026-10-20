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
type SheetStyle = 0|1|2|3|4|5|6|7|8|9|10;

/**
 * Compact printable leave form: 1 sheet = 1 leave request.
 * White space replaces heavy grid borders; section bars and status carry hierarchy.
 */
function leaveSheetXml(
  item: AdminLeaveRequest,
  typeLabel: (type: AdminLeaveRequest["type"]) => string,
  statusLabels: Record<Status,string>
): string {
  const rows = new Map<number,{height:number;cells:Map<number,string>}>();
  const merges:string[]=[];
  const reasonHeight=Math.max(57,Math.min(126,Math.ceil((item.reason||"").length/82)*18+14));
  const noteHeight=Math.max(43,Math.min(114,Math.ceil((item.decisionNote||"").length/70)*18+12));
  const heights = new Map<number,number>([
    [1,6],[2,38],[3,20],[4,9],[5,24],[6,29],[7,30],[8,30],
    [9,9],[10,24],[11,30],[12,29],[13,29],[14,9],[15,24],
    [16,Math.ceil(reasonHeight/3)],[17,Math.floor(reasonHeight/3)],[18,reasonHeight-Math.ceil(reasonHeight/3)-Math.floor(reasonHeight/3)],
    [19,30],[20,9],[21,24],[22,30],
    [23,Math.ceil(noteHeight/2)],[24,Math.floor(noteHeight/2)],[25,10],[26,23]
  ]);
  function put(row:number,col:number,value:string,style:number) {
    let record=rows.get(row);
    if(!record){
      record={height:heights.get(row)??22,cells:new Map()};
      rows.set(row,record);
    }
    record.cells.set(col,cell(columnLetters(col),row,value,style));
  }
  function area(firstRow:number,firstCol:number,lastRow:number,lastCol:number,value:string,style:number) {
    for(let row=firstRow;row<=lastRow;row++)
      for(let col=firstCol;col<=lastCol;col++)
        put(row,col,row===firstRow&&col===firstCol?value:"",style);
    if(firstRow!==lastRow||firstCol!==lastCol)
      merges.push('<mergeCell ref="'+columnLetters(firstCol)+firstRow+':'+columnLetters(lastCol)+lastRow+'"/>');
  }
  const decision=item.status==="pending"?"รอพิจารณา":statusLabels[item.status];
  const decisionStyle=item.status==="approved"?8:item.status==="rejected"?9:7;

  // Brand and document heading
  area(1,0,1,7,"",13);
  area(2,0,2,5,"ใบลาพนักงาน",1);
  area(2,6,2,7,"ATTENDANCE V2",11);
  area(3,0,3,7,"แบบฟอร์มการลา  /  LEAVE REQUEST",2);

  area(5,0,5,7,"ข้อมูลพนักงาน",3);
  area(6,0,6,1,"เลขที่ใบลา",4);
  area(6,2,6,3,item.id,12);
  area(6,4,6,5,"สถานะ",4);
  area(6,6,6,7,statusLabels[item.status],decisionStyle);
  area(7,0,7,1,"ชื่อ–นามสกุล",4);
  area(7,2,7,7,item.employeeName,5);
  area(8,0,8,1,"รหัสพนักงาน",4);
  area(8,2,8,3,item.employeeCode,5);
  area(8,4,8,5,"แผนก",4);
  area(8,6,8,7,item.department,5);

  area(10,0,10,7,"รายละเอียดการลา",3);
  area(11,0,11,1,"ประเภทการลา",4);
  area(11,2,11,7,typeLabel(item.type),5);
  area(12,0,12,1,"ตั้งแต่วันที่",4);
  area(12,2,12,3,dmy(item.startDate),5);
  area(12,4,12,5,"ถึงวันที่",4);
  area(12,6,12,7,dmy(item.endDate),5);
  area(13,0,13,1,"จำนวนวัน",4);
  area(13,2,13,3,String(countDays(item.startDate,item.endDate))+" วัน",5);
  area(13,4,13,5,"วันที่ยื่น",4);
  area(13,6,13,7,dmy(item.submittedDate),5);

  area(15,0,15,7,"เหตุผลการลา",3);
  area(16,0,18,7,item.reason||"—",6);
  area(19,0,19,1,"เอกสารแนบ",4);
  area(19,2,19,7,item.attachment ? item.attachment+" (ชื่อไฟล์ตัวอย่าง)" : "ไม่มีเอกสารแนบ",5);

  area(21,0,21,7,"ผลการพิจารณา",3);
  area(22,0,22,1,"ผลการอนุมัติ",4);
  area(22,2,22,3,decision,decisionStyle);
  area(22,4,22,5,"วันที่พิจารณา",4);
  area(22,6,22,7,item.decisionDate?dmy(item.decisionDate):"—",5);
  area(23,0,24,1,"หมายเหตุ",4);
  area(23,2,24,7,item.decisionNote||"—",6);

  area(26,0,26,7,"ATTENDANCE V2  •  เอกสารตัวอย่างสำหรับทดสอบระบบ  •  ไม่ใช่เอกสารอนุมัติจริง",10);

  const rowXml=Array.from({length:26},(_,index)=>{
    const row=index+1, record=rows.get(row);
    const body=record ? [...record.cells.entries()].sort((a,b)=>a[0]-b[0]).map(pair=>pair[1]).join("") : "";
    return '<row r="'+row+'" ht="'+(heights.get(row)??20)+'" customHeight="1">'+body+'</row>';
  }).join("");
  const widths=[12,12,15,13,12,13,15,18];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
    '<dimension ref="A1:H26"/>'+
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="20"/>'+
    '<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>'+
    '<sheetData>'+rowXml+'</sheetData>'+
    '<mergeCells count="'+merges.length+'">'+merges.join("")+'</mergeCells>'+
    '<printOptions horizontalCentered="1"/>'+
    '<pageMargins left="0.35" right="0.35" top="0.38" bottom="0.38" header="0.14" footer="0.14"/>'+
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/>'+
    '</worksheet>';
}
function makeStyles():string {
  const font=(content:string,size:number)=>'<font>'+content+'<sz val="'+size+'"/><name val="Tahoma"/></font>';
  const ink='<color rgb="FF28465A"/>';
  const navy='<color rgb="FF164563"/>';
  const muted='<color rgb="FF748B9C"/>';
  const white='<color rgb="FFFFFFFF"/>';
  const fonts=[
    font(ink,10.5),
    font('<b/>'+navy,17),
    font(muted,9),
    font('<b/>'+navy,10),
    font('<b/>'+muted,10),
    font('<b/><color rgb="FF996B25"/>',10),
    font('<b/><color rgb="FF287651"/>',10),
    font('<b/><color rgb="FFA4554D"/>',10),
    font(muted,8.5)
  ];
  const fills=[
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF164563"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF2F7"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF4E5"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF6EF"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFBEDEC"/><bgColor indexed="64"/></patternFill></fill>'
  ];
  const bottom='<border><left/><right/><top/><bottom style="hair"><color rgb="FFE1E9EF"/></bottom><diagonal/></border>';
  const borders='<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+bottom+'</borders>';
  function format(fontId:number,fillId:number,borderId:number,alignment:string) {
    return '<xf numFmtId="0" fontId="'+fontId+'" fillId="'+fillId+'" borderId="'+borderId+
      '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment '+alignment+'/></xf>';
  }
  const formats=[
    format(0,0,0,'vertical="center"'),
    format(1,0,0,'vertical="center"'),
    format(2,0,0,'vertical="center"'),
    format(3,3,0,'vertical="center" indent="1"'),
    format(4,0,1,'vertical="center" indent="1" wrapText="1"'),
    format(0,0,1,'vertical="center" indent="1" wrapText="1"'),
    format(0,4,0,'vertical="center" indent="1" wrapText="1"'),
    format(5,5,0,'horizontal="center" vertical="center"'),
    format(6,6,0,'horizontal="center" vertical="center"'),
    format(7,7,0,'horizontal="center" vertical="center"'),
    format(8,3,0,'horizontal="center" vertical="center"'),
    format(3,0,0,'horizontal="right" vertical="center"'),
    format(3,0,1,'vertical="center" indent="1"'),
    format(0,2,0,'vertical="center"')
  ];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="'+fonts.length+'">'+fonts.join("")+'</fonts>'+
    '<fills count="'+fills.length+'">'+fills.join("")+'</fills>'+
    borders+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="'+formats.length+'">'+formats.join("")+'</cellXfs>'+
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
