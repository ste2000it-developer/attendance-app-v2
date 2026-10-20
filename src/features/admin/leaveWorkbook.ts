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
 * One A5 landscape sheet per leave request.
 * HR-style compact table with light section bands, clearly visible thin borders,
 * and generous enough text weight to remain legible when printed.
 */
function leaveSheetXml(
  item: AdminLeaveRequest,
  typeLabel: (type: AdminLeaveRequest["type"]) => string,
  statusLabels: Record<Status,string>
): string {
  const cells = new Map<number,Map<number,string>>();
  const merges:string[]=[];
  // All cells in a merged area get perimeter-appropriate borders. This avoids
  // missing right edges and phantom internal dividers in Microsoft Excel.
  const kinds = ["section","label","value","important","long","pending","approved","rejected"] as const;
  type Kind=typeof kinds[number];
  const gridStyle=(kind:Kind,edge:number)=>5+kinds.indexOf(kind)*4+edge;
  function write(row:number,col:number,value:string,style:number) {
    let values=cells.get(row);
    if(!values) {values=new Map();cells.set(row,values);}
    values.set(col,cell(columnLetters(col),row,value,style));
  }
  function span(row:number,start:number,end:number,value:string,kind:Kind) {
    for(let col=start;col<=end;col++){
      const edge=start===end?0:col===start?1:col===end?3:2;
      write(row,col,col===start?value:"",gridStyle(kind,edge));
    }
    if(end>start)
      merges.push('<mergeCell ref="'+columnLetters(start)+row+':'+columnLetters(end)+row+'"/>');
  }
  function plain(row:number,start:number,end:number,value:string,style:number) {
    for(let col=start;col<=end;col++)write(row,col,col===start?value:"",style);
    if(end>start)
      merges.push('<mergeCell ref="'+columnLetters(start)+row+':'+columnLetters(end)+row+'"/>');
  }
  function textHeight(value:string,perLine:number,minimum:number):number {
    const lines=(value||"—").split("\n").reduce((sum,line)=>
      sum+Math.max(1,Math.ceil(line.length/perLine)),0);
    return Math.min(120,Math.max(minimum,16*lines+8));
  }
  const attachment=item.attachment?item.attachment+" (ชื่อไฟล์ตัวอย่าง)":"ไม่มีเอกสารแนบ";
  const status=item.status==="pending"?"รอพิจารณา":statusLabels[item.status];
  const statusKind:Kind=item.status==="approved"?"approved":item.status==="rejected"?"rejected":"pending";
  const heights=[
    28,15,5,20,26,26,5,20,26,27,
    textHeight(attachment,34,28),
    textHeight(item.reason,78,36),
    5,20,27,
    textHeight(item.decisionNote,76,31),
    5,15
  ];
  // Headline: no full-width dark bar.
  plain(1,0,3,"ใบลาพนักงาน",1);
  plain(1,4,5,"เลขที่  "+item.id,2);
  plain(2,0,5,"ATTENDANCE V2  /  แบบฟอร์มการลา",3);

  span(4,0,5,"ข้อมูลพนักงาน","section");
  span(5,0,0,"ชื่อ–นามสกุล","label");
  span(5,1,2,item.employeeName,"important");
  span(5,3,3,"รหัสพนักงาน","label");
  span(5,4,5,item.employeeCode,"value");
  span(6,0,0,"แผนก","label");
  span(6,1,2,item.department,"value");
  span(6,3,3,"วันที่ยื่น","label");
  span(6,4,5,dmy(item.submittedDate),"value");

  span(8,0,5,"รายละเอียดการลา","section");
  span(9,0,0,"ประเภทการลา","label");
  span(9,1,5,typeLabel(item.type),"important");
  span(10,0,0,"วันเริ่มลา","label");
  span(10,1,2,dmy(item.startDate),"value");
  span(10,3,3,"วันสิ้นสุด","label");
  span(10,4,5,dmy(item.endDate),"value");
  span(11,0,0,"จำนวนวัน","label");
  span(11,1,2,String(countDays(item.startDate,item.endDate))+" วัน","important");
  span(11,3,3,"เอกสารแนบ","label");
  span(11,4,5,attachment,"long");
  span(12,0,0,"เหตุผลการลา","label");
  span(12,1,5,item.reason||"—","long");

  span(14,0,5,"ผลการพิจารณา","section");
  span(15,0,0,"สถานะ","label");
  span(15,1,2,status,statusKind);
  span(15,3,3,"วันที่พิจารณา","label");
  span(15,4,5,item.decisionDate?dmy(item.decisionDate):"—","value");
  span(16,0,0,"หมายเหตุ","label");
  span(16,1,5,item.decisionNote||"ไม่มีหมายเหตุ","long");

  plain(18,0,5,"ATTENDANCE V2  ·  ข้อมูลสำหรับทดสอบเท่านั้น ไม่ใช่เอกสารอนุมัติจริง",4);

  const data=heights.map((height,i)=>{
    const row=i+1;
    const content=[...(cells.get(row)?.entries()??[])]
      .sort((a,b)=>a[0]-b[0]).map(entry=>entry[1]).join("");
    return '<row r="'+row+'" ht="'+height+'" customHeight="1">'+content+'</row>';
  }).join("");
  // Total width is intentionally restrained so A5 prints at readable scale.
  const widths=[16,19,18,17,18,20];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
    '<dimension ref="A1:F18"/>'+
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="20"/>'+
    '<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join("")+'</cols>'+
    '<sheetData>'+data+'</sheetData>'+
    '<mergeCells count="'+merges.length+'">'+merges.join("")+'</mergeCells>'+
    '<printOptions horizontalCentered="1" verticalCentered="0"/>'+
    '<pageMargins left="0.22" right="0.22" top="0.22" bottom="0.22" header="0.1" footer="0.1"/>'+
    '<pageSetup paperSize="11" orientation="landscape" fitToWidth="1" fitToHeight="1"/>'+
    '</worksheet>';
}
function makeStyles():string {
  const font=(body:string,size:number)=>
    '<font>'+body+'<sz val="'+size+'"/><name val="Tahoma"/></font>';
  const navy='<color rgb="FF203F55"/>';
  const ink='<color rgb="FF2A4255"/>';
  const muted='<color rgb="FF536B7D"/>';
  const fonts=[
    font(ink,10.5),                              // 0 ordinary
    font('<b/>'+navy,15),                         // 1 document title
    font('<b/>'+navy,10),                         // 2 reference no.
    font(muted,9),                               // 3 subtitle
    font(muted,8),                               // 4 footnote
    font('<b/>'+navy,10.5),                       // 5 section
    font('<b/>'+muted,9.5),                       // 6 label
    font(ink,10.5),                              // 7 value
    font('<b/>'+navy,10.5),                       // 8 emphasized value
    font(ink,10),                                // 9 multiline value
    font('<b/><color rgb="FF956B28"/>',10),      // 10 pending
    font('<b/><color rgb="FF246C4C"/>',10),      // 11 approved
    font('<b/><color rgb="FFA4514B"/>',10)       // 12 rejected
  ];
  const fills=[
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF2F7"/><bgColor indexed="64"/></patternFill></fill>', // section
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF4F7FA"/><bgColor indexed="64"/></patternFill></fill>', // label
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFCF4E6"/><bgColor indexed="64"/></patternFill></fill>', // pending
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF6EE"/><bgColor indexed="64"/></patternFill></fill>', // approved
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFAECEB"/><bgColor indexed="64"/></patternFill></fill>'  // rejected
  ];
  const borderLine='<color rgb="FFC5D5E0"/>';
  // Borders: full/left+top+bottom/top+bottom/right+top+bottom.
  // Internal lines are omitted inside merged cells; the outer perimeter stays visible.
  function border(edge:number):string {
    const outer=(on:boolean)=>on?'<left style="thin">'+borderLine+'</left>':'<left/>';
    const right=(on:boolean)=>on?'<right style="thin">'+borderLine+'</right>':'<right/>';
    return '<border>'+outer(edge===0||edge===1)+right(edge===0||edge===3)+
      '<top style="thin">'+borderLine+'</top><bottom style="thin">'+borderLine+'</bottom><diagonal/></border>';
  }
  const borders=['<border><left/><right/><top/><bottom/><diagonal/></border>',...Array.from({length:4},(_,edge)=>border(edge))];
  function xf(fontId:number,fillId:number,borderId:number,align:string){
    return '<xf numFmtId="0" fontId="'+fontId+'" fillId="'+fillId+'" borderId="'+borderId+
      '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment '+align+'/></xf>';
  }
  const styles=[
    xf(0,0,0,'vertical="center"'),
    xf(1,0,0,'vertical="center"'),
    xf(2,0,0,'horizontal="right" vertical="center"'),
    xf(3,0,0,'vertical="center"'),
    xf(4,0,0,'vertical="center"')
  ];
  const kinds=[
    {fontId:5,fillId:2,align:'vertical="center" indent="1"'},                         // section
    {fontId:6,fillId:3,align:'vertical="center" indent="1" wrapText="1"'},            // label
    {fontId:7,fillId:0,align:'vertical="center" indent="1" wrapText="1"'},            // value
    {fontId:8,fillId:0,align:'vertical="center" indent="1" wrapText="1"'},            // important
    {fontId:9,fillId:0,align:'vertical="center" indent="1" wrapText="1"'},            // long
    {fontId:10,fillId:4,align:'vertical="center" indent="1"'},                        // pending
    {fontId:11,fillId:5,align:'vertical="center" indent="1"'},                        // approved
    {fontId:12,fillId:6,align:'vertical="center" indent="1"'}                         // rejected
  ];
  for(const kind of kinds)
    for(let edge=0;edge<4;edge++)
      styles.push(xf(kind.fontId,kind.fillId,edge+1,kind.align));
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="'+fonts.length+'">'+fonts.join("")+'</fonts>'+
    '<fills count="'+fills.length+'">'+fills.join("")+'</fills>'+
    '<borders count="'+borders.length+'">'+borders.join("")+'</borders>'+
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
