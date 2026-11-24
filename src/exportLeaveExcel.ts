import type { LeaveRequest } from './domain/attendanceRules';

/**
 * Each leave request becomes its own real .xlsx file, one A5 portrait page.
 * The preview UI passes demo data only. No network or Firebase writes.
 */
export async function exportLeaveA5(
  request: LeaveRequest, employeeName: string, employeeCode: string, countDays: number,
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attendance App V2';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('ใบลา', {
    pageSetup: {
      paperSize: 11, // A5, NOT paperSize 9 (A4)
      orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
      margins: { left: 0.26, right: 0.26, top: 0.4, bottom: 0.4, header: 0, footer: 0 },
      horizontalCentered: true,
    },
  });
  sheet.columns = [
    { key: 'a', width: 12 }, { key: 'b', width: 12 }, { key: 'c', width: 12 },
    { key: 'd', width: 12 }, { key: 'e', width: 12 },
  ];
  sheet.pageSetup.printArea = 'A1:E22';
  sheet.mergeCells('A1:E2');
  sheet.getCell('A1').value = 'แบบฟอร์มคำขอลา';
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('A1').font = { name: 'TH Sarabun New', bold: true, size: 18, color: { argb: 'FF194E54' } };
  sheet.getRow(1).height = 20;
  sheet.getRow(2).height = 18;
  const status = request.status === 'pending' ? 'รออนุมัติ' : request.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ';
  const portion = request.portion === 'morning' ? 'ครึ่งวันเช้า' : request.portion === 'afternoon' ? 'ครึ่งวันบ่าย' : 'เต็มวัน';
  const fields: Array<[string, string]> = [
    ['ชื่อพนักงาน', employeeName],
    ['รหัสพนักงาน', employeeCode || '—'],
    ['ประเภทการลา', request.type],
    ['วันที่เริ่ม', request.startDate.split('-').reverse().join('/')],
    ['วันที่สิ้นสุด', request.endDate.split('-').reverse().join('/')],
    ['ระยะเวลา', portion + ' (' + countDays + ' วันทำงาน)'],
    ['สถานะ', status],
    ['เหตุผล', request.reason || '—'],
  ];
  let row = 4;
  for (const [label, value] of fields) {
    sheet.mergeCells('A' + row + ':B' + row);
    sheet.mergeCells('C' + row + ':E' + row);
    const a = sheet.getCell('A' + row), c = sheet.getCell('C' + row);
    a.value = label; c.value = value;
    a.font = { name: 'TH Sarabun New', size: 14, bold: true, color: { argb: 'FF526873' } };
    c.font = { name: 'TH Sarabun New', size: 14, color: { argb: 'FF17333D' } };
    a.alignment = { vertical: 'middle' };
    c.alignment = { vertical: 'middle', wrapText: true };
    sheet.getRow(row).height = row === 11 ? 32 : 26;
    for (let col = 1; col <= 5; col++) {
      sheet.getRow(row).getCell(col).border = { bottom: { style: 'hair', color: { argb: 'FFD4E0E2' } } };
    }
    row++;
  }
  sheet.mergeCells('A15:E15');
  sheet.getCell('A15').value = 'หมายเหตุ: เอกสารนี้สร้างจากข้อมูลที่แสดงในระบบ';
  sheet.getCell('A15').font = { name: 'TH Sarabun New', size: 12, italic: true, color: { argb: 'FF60737D' } };
  sheet.mergeCells('A18:B18'); sheet.mergeCells('D18:E18');
  sheet.getCell('A18').value = 'ลงชื่อผู้ยื่น ........................';
  sheet.getCell('D18').value = 'ลงชื่อผู้อนุมัติ ....................';
  for (const cell of ['A18', 'D18']) {
    sheet.getCell(cell).font = { name: 'TH Sarabun New', size: 13, color: { argb: 'FF17333D' } };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeCode = (employeeCode || 'employee').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = 'leave-' + safeCode + '-' + request.startDate + '.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
